// Admin-only: actions on admin documents — share to clients, email to clients, delete share
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { getCors } from "../_shared/admin-cors.ts";

const PORTAL_URL = "https://aethyx.space/portal";

Deno.serve(async (req) => {
  const cors = getCors(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: userData } = await admin.auth.getUser(token);
    if (!userData.user) return json({ error: "Auth required" }, 401, cors);
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return json({ error: "Admin only" }, 403, cors);

    const body = await req.json();
    const action = String(body.action || "");
    const adminDocId = String(body.adminDocId || "");
    const clientProfileIds: string[] = Array.isArray(body.clientProfileIds) ? body.clientProfileIds : [];
    const message = body.message ? String(body.message).slice(0, 4000) : "";
    const subject = body.subject ? String(body.subject).slice(0, 200) : "";

    if (!action) return json({ error: "action required" }, 400, cors);

    if (action === "share" || action === "email" || action === "share_and_email") {
      if (!adminDocId) return json({ error: "adminDocId required" }, 400, cors);
      const { data: doc, error: docErr } = await admin.from("admin_documents").select("*").eq("id", adminDocId).maybeSingle();
      if (docErr || !doc) return json({ error: "Document not found" }, 404, cors);

      const targetIds = clientProfileIds.length
        ? clientProfileIds
        : (body.targetAll ? (await admin.from("client_profiles").select("id").eq("status", "active")).data?.map((r: any) => r.id) || [] : []);

      const results: any[] = [];
      for (const profileId of targetIds) {
        const { data: profile } = await admin.from("client_profiles").select("id, user_id, email, first_name, full_name").eq("id", profileId).maybeSingle();
        if (!profile) { results.push({ profileId, ok: false, error: "Profile missing" }); continue; }

        let sharedDocId: string | null = null;
        if (action === "share" || action === "share_and_email") {
          // Avoid duplicate share for same admin doc + client
          const { data: existing } = await admin.from("client_documents")
            .select("id").eq("client_profile_id", profileId).eq("parent_admin_doc_id", adminDocId).maybeSingle();
          if (existing) {
            sharedDocId = existing.id;
          } else {
            const { data: ins, error: insErr } = await admin.from("client_documents").insert({
              client_profile_id: profileId,
              user_id: profile.user_id,
              title: doc.title,
              file_url: doc.file_path,
              uploaded_by: "admin",
              parent_admin_doc_id: adminDocId,
              note: message || null,
            }).select("id").single();
            if (insErr) { results.push({ profileId, ok: false, error: insErr.message }); continue; }
            sharedDocId = ins.id;
          }
        }

        if (action === "email" || action === "share_and_email") {
          if (!profile.email) { results.push({ profileId, ok: false, error: "No email on profile", sharedDocId }); continue; }
          // Generate signed URL (7 days)
          const { data: signed, error: sErr } = await admin.storage.from("admin-documents").createSignedUrl(doc.file_path, 60 * 60 * 24 * 7);
          if (sErr || !signed) { results.push({ profileId, ok: false, error: "Could not sign URL", sharedDocId }); continue; }
          const inv = await admin.functions.invoke("send-transactional-email", {
            body: {
              templateName: "document-share",
              recipientEmail: profile.email,
              idempotencyKey: `doc-share-${adminDocId}-${profileId}-${Date.now()}`,
              templateData: {
                recipientName: profile.first_name || profile.full_name?.split(" ")[0] || "",
                documentTitle: doc.title,
                message,
                downloadUrl: signed.signedUrl,
                expiresIn: "7 days",
              },
            },
          });
          if (inv.error) { results.push({ profileId, ok: false, error: inv.error.message, sharedDocId }); continue; }
        }

        results.push({ profileId, ok: true, sharedDocId });
      }
      return json({ success: true, results }, 200, cors);
    }

    if (action === "unshare") {
      const sharedDocId = String(body.sharedDocId || "");
      if (!sharedDocId) return json({ error: "sharedDocId required" }, 400, cors);
      const { error } = await admin.from("client_documents").delete().eq("id", sharedDocId);
      if (error) return json({ error: error.message }, 500, cors);
      return json({ success: true }, 200, cors);
    }

    return json({ error: "Unknown action" }, 400, cors);
  } catch (err) {
    console.error("[document-actions]", err);
    return json({ error: err instanceof Error ? err.message : "Unknown" }, 500, cors);
  }
});

function json(body: any, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
