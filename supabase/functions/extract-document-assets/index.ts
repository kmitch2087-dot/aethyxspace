// supabase/functions/extract-document-assets/index.ts
// Admin-only: extract structured business info from an uploaded PDF (client_documents,
// admin_documents, or client_document_slots), staging results as pending
// client_asset_scrape_items for review — mirrors scrape-client-assets' review-queue
// pattern, source is a document, not a URL.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { getCors } from "../_shared/admin-cors.ts";

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const GEMINI_TIMEOUT_MS = 30_000;

function json(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

const EXTRACTION_PROMPT = `You are helping tag brand and business content found in a document uploaded to a design agency's client management system. Given the document's content, identify meaningful, distinct pieces of information in these categories:
- brand_voice, tagline, motto, mission, values: brand identity content
- contact_info: phone numbers, email addresses, physical addresses
- hours: business/operating hours
- staff: practitioner/employee names and their positions/titles/roles (one item per person, or grouped if clearly listed together)
- other: any other genuinely useful business information not covered above

Extract up to 10 distinct items total. Skip categories with no real content in the document — do not invent or guess.

For each item, suggest a category from exactly this list: brand_voice, tagline, motto, mission, values, contact_info, hours, staff, other. Respond with ONLY a JSON array, no other text, in this shape: [{"category": "...", "label": "...", "content": "..."}].`;

Deno.serve(async (req: Request) => {
  const cors = getCors(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: userData } = await admin.auth.getUser(token);
    if (!userData.user) return json({ error: "Auth required" }, 401, cors);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Admin only" }, 403, cors);

    const body = await req.json();
    const clientProfileId = String(body.clientProfileId || "");
    const sourceDocumentId = String(body.sourceDocumentId || "");
    const sourceDocumentType = String(body.sourceDocumentType || "");
    const planId = body.planId ? String(body.planId) : null;
    if (!clientProfileId || !sourceDocumentId) {
      return json({ error: "clientProfileId and sourceDocumentId required" }, 400, cors);
    }
    if (!["client_documents", "admin_documents", "client_document_slots"].includes(sourceDocumentType)) {
      return json({ error: "sourceDocumentType must be client_documents, admin_documents, or client_document_slots" }, 400, cors);
    }

    // Resolve the document's storage path + a human-readable label from the right table.
    let storagePath: string | null = null;
    let bucket: string;
    let docLabel = "uploaded document";
    if (sourceDocumentType === "client_documents") {
      const { data: doc } = await admin.from("client_documents").select("title, file_url, parent_admin_doc_id").eq("id", sourceDocumentId).maybeSingle();
      if (!doc) return json({ error: "Document not found" }, 404, cors);
      // Documents shared to a client via the admin's "Share with client(s)" action carry
      // parent_admin_doc_id and physically live in admin-documents, not client-documents —
      // same bucket-selection logic PortalDocuments.tsx already uses before any storage
      // call on this column.
      bucket = doc.parent_admin_doc_id ? "admin-documents" : "client-documents";
      // client_documents.file_url isn't always a clean relative storage path — some rows
      // store a fuller path containing a "/client-documents/" marker (same defensive
      // stripping ClientDetail.tsx and PortalDocuments.tsx already apply before any
      // storage call on this column).
      storagePath = doc.file_url;
      if (storagePath) {
        const marker = "/client-documents/";
        const idx = storagePath.indexOf(marker);
        if (idx !== -1) storagePath = storagePath.substring(idx + marker.length);
      }
      docLabel = doc.title || docLabel;
    } else if (sourceDocumentType === "client_document_slots") {
      // Project document slots (plan/agreement/audit uploads) live in client-slot-docs
      // with a clean relative storage_path.
      bucket = "client-slot-docs";
      const { data: doc } = await admin.from("client_document_slots").select("storage_path, file_name").eq("id", sourceDocumentId).maybeSingle();
      if (!doc) return json({ error: "Document not found" }, 404, cors);
      storagePath = doc.storage_path;
      docLabel = doc.file_name || docLabel;
    } else {
      bucket = "admin-documents";
      const { data: doc } = await admin.from("admin_documents").select("title, file_path").eq("id", sourceDocumentId).maybeSingle();
      if (!doc) return json({ error: "Document not found" }, 404, cors);
      storagePath = doc.file_path;
      docLabel = doc.title || docLabel;
    }
    if (!storagePath) return json({ error: "Document has no file" }, 400, cors);
    if (!storagePath.toLowerCase().endsWith(".pdf")) {
      return json({ error: "Only PDF files can be extracted from" }, 400, cors);
    }

    const { data: scrapeRow, error: scrapeInsertErr } = await admin
      .from("client_asset_scrapes")
      .insert({
        client_profile_id: clientProfileId,
        source_document_id: sourceDocumentId,
        source_document_type: sourceDocumentType,
        status: "running",
        plan_id: planId,
      })
      .select("id")
      .single();
    if (scrapeInsertErr || !scrapeRow) {
      return json({ error: "Could not start extraction" }, 500, cors);
    }
    const scrapeId = scrapeRow.id;

    try {
      const { data: fileBlob, error: dlErr } = await admin.storage.from(bucket).download(storagePath);
      if (dlErr || !fileBlob) {
        // StorageError.message is often an unhelpful "{}" — log and surface the full
        // error plus the exact bucket/path so failures are actually diagnosable.
        console.error("[extract-document-assets] download failed", { bucket, storagePath, dlErr });
        const detail = dlErr ? `${dlErr.message || ""} ${JSON.stringify(dlErr)}`.trim() : "unknown error";
        throw new Error(`Could not download ${bucket}/${storagePath}: ${detail}`);
      }
      if (fileBlob.size > MAX_FILE_BYTES) {
        throw new Error(`File too large (${(fileBlob.size / 1024 / 1024).toFixed(1)}MB, max 15MB)`);
      }
      const base64Data = arrayBufferToBase64(await fileBlob.arrayBuffer());

      let textCount = 0;
      let geminiError: string | null = null;
      const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
      if (!GEMINI_API_KEY) {
        geminiError = "GEMINI_API_KEY is not configured";
      } else {
        try {
          const geminiController = new AbortController();
          const geminiTimeout = setTimeout(() => geminiController.abort(), GEMINI_TIMEOUT_MS);
          let geminiResp: Response;
          try {
            geminiResp = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [{
                    parts: [
                      { text: EXTRACTION_PROMPT },
                      { inline_data: { mime_type: "application/pdf", data: base64Data } },
                    ],
                  }],
                }),
                signal: geminiController.signal,
              },
            );
          } finally {
            clearTimeout(geminiTimeout);
          }
          if (!geminiResp.ok) {
            const bodyText = await geminiResp.text().catch(() => "");
            geminiError = `Gemini API returned ${geminiResp.status}: ${bodyText.slice(0, 300)}`;
            console.warn("[extract-document-assets] Gemini call failed:", geminiResp.status, bodyText.slice(0, 500));
          } else {
            const geminiJson = await geminiResp.json();
            const text = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text || "";
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
              geminiError = "Gemini response did not contain a parseable JSON array";
              console.warn("[extract-document-assets] Gemini response had no JSON array. Raw text:", text.slice(0, 500));
            } else {
              const items = JSON.parse(jsonMatch[0]);
              const validCategories = new Set(["brand_voice", "tagline", "motto", "mission", "values", "contact_info", "hours", "staff", "other"]);
              for (const item of items) {
                if (!item?.content || typeof item.content !== "string") continue;
                const category = validCategories.has(item.category) ? item.category : "other";
                await admin.from("client_asset_scrape_items").insert({
                  scrape_id: scrapeId,
                  kind: "text",
                  suggested_category: category,
                  suggested_label: String(item.label || `From ${docLabel}`).slice(0, 200),
                  content: String(item.content).slice(0, 5000),
                  status: "pending",
                });
                textCount++;
              }
              if (textCount === 0) {
                geminiError = "Gemini returned a valid response but suggested zero text items";
              }
            }
          }
        } catch (err) {
          geminiError = err instanceof Error ? err.message : "Gemini call threw an unexpected error";
          console.warn("[extract-document-assets] Gemini extraction failed:", err);
        }
      }

      await admin
        .from("client_asset_scrapes")
        .update({ status: "complete", completed_at: new Date().toISOString(), error_message: geminiError })
        .eq("id", scrapeId);
      return json({ ok: true, scrapeId, textCount, geminiError }, 200, cors);
    } catch (err) {
      await admin
        .from("client_asset_scrapes")
        .update({ status: "failed", error_message: err instanceof Error ? err.message : "Unknown error", completed_at: new Date().toISOString() })
        .eq("id", scrapeId);
      return json({ ok: false, error: "Extraction failed", scrapeId }, 500, cors);
    }
  } catch (err) {
    console.error("[extract-document-assets]", err);
    return json({ error: err instanceof Error ? err.message : "Unknown" }, 500, cors);
  }
});
