// supabase/functions/scrape-client-assets/index.ts
// Admin-only: scrape a client's website URL, stage extracted images/text as
// pending client_asset_scrape_items for review — never writes to client_assets directly.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { getCors } from "../_shared/admin-cors.ts";

const MAX_IMAGES = 10;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_TEXT_CHARS = 8000;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function json(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

// Basic SSRF guard: block obvious private/loopback/link-local hosts. Not exhaustive
// (doesn't resolve DNS to catch a hostname that resolves to a private IP), but blocks
// the straightforward cases of someone pointing this at internal infrastructure directly.
function isPrivateOrLoopback(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h === "127.0.0.1" || h === "::1") return true;
  const ipv4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const a = parseInt(ipv4[1]);
    const b = parseInt(ipv4[2]);
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a === 127) return true;
  }
  return false;
}

function stripTagsToText(html: string): string {
  let s = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
  s = s.replace(/<[^>]+>/g, " ");
  s = s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
  s = s.replace(/\s+/g, " ").trim();
  return s.slice(0, MAX_TEXT_CHARS);
}

function extractImages(html: string, baseUrl: string): string[] {
  const urls = new Set<string>();
  const re = /<img[^>]+src=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && urls.size < MAX_IMAGES * 3) {
    try {
      urls.add(new URL(m[1], baseUrl).toString());
    } catch {
      // ignore invalid/relative-without-base src values
    }
  }
  return Array.from(urls).slice(0, MAX_IMAGES);
}

function extractOgTags(html: string): Record<string, string> {
  const tags: Record<string, string> = {};
  const re1 = /<meta[^>]+(?:property|name)=["']og:(title|description|image)["'][^>]+content=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re1.exec(html))) tags[m[1]] = m[2];
  const re2 = /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:(title|description|image)["']/gi;
  while ((m = re2.exec(html))) tags[m[2]] = m[1];
  return tags;
}

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
    const sourceUrl = String(body.url || "");
    if (!clientProfileId || !sourceUrl) return json({ error: "clientProfileId and url required" }, 400, cors);

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(sourceUrl);
    } catch {
      return json({ error: "Invalid URL" }, 400, cors);
    }
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return json({ error: "URL must be http or https" }, 400, cors);
    }
    if (isPrivateOrLoopback(parsedUrl.hostname)) {
      return json({ error: "URL not allowed" }, 400, cors);
    }

    const { data: scrapeRow, error: scrapeInsertErr } = await admin
      .from("client_asset_scrapes")
      .insert({ client_profile_id: clientProfileId, source_url: sourceUrl, status: "running" })
      .select("id")
      .single();
    if (scrapeInsertErr || !scrapeRow) {
      return json({ error: "Could not start scrape" }, 500, cors);
    }
    const scrapeId = scrapeRow.id;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      let pageResp: Response;
      try {
        pageResp = await fetch(parsedUrl.toString(), { signal: controller.signal, redirect: "follow" });
      } finally {
        clearTimeout(timeout);
      }
      if (!pageResp.ok) throw new Error(`Fetch failed: ${pageResp.status}`);
      const html = await pageResp.text();

      const imageUrls = extractImages(html, parsedUrl.toString());
      const ogTags = extractOgTags(html);
      const visibleText = stripTagsToText(html);

      let imageCount = 0;
      for (let i = 0; i < imageUrls.length; i++) {
        try {
          const imgResp = await fetch(imageUrls[i]);
          if (!imgResp.ok) continue;
          const blob = await imgResp.blob();
          if (blob.size === 0 || blob.size > MAX_IMAGE_BYTES) continue;
          const ext = (imageUrls[i].split(".").pop() || "png").split("?")[0].slice(0, 5);
          const storagePath = `_scrapes/${scrapeId}/${i}.${ext}`;
          const { error: upErr } = await admin.storage.from("client-assets").upload(storagePath, blob);
          if (upErr) continue;
          const isLikelyLogo = i === 0 || imageUrls[i] === ogTags.image;
          await admin.from("client_asset_scrape_items").insert({
            scrape_id: scrapeId,
            kind: "image",
            suggested_category: isLikelyLogo ? "logo" : "other",
            suggested_label: isLikelyLogo ? "Logo (scraped)" : `Image ${i + 1} (scraped)`,
            content: storagePath,
            source_url: imageUrls[i],
            status: "pending",
          });
          imageCount++;
        } catch {
          // skip this one image, keep going with the rest
        }
      }

      let textCount = 0;
      const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
      if (GEMINI_API_KEY && visibleText.length > 40) {
        const prompt = `You are helping tag brand content scraped from a client's website for a design agency. Given the extracted page text and any OpenGraph metadata below, identify up to 5 distinct, meaningful brand-relevant blurbs (e.g. a tagline, mission statement, brand voice sample, "about" copy). For each, suggest a category from exactly this list: brand_voice, tagline, motto, mission, values, other. Respond with ONLY a JSON array, no other text, in this shape: [{"category": "...", "label": "...", "content": "..."}].

OpenGraph title: ${ogTags.title || "(none)"}
OpenGraph description: ${ogTags.description || "(none)"}

Page text:
${visibleText}`;

        try {
          const geminiResp = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
            {
              method: "POST",
              headers: { Authorization: `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: "gemini-2.5-flash",
                messages: [{ role: "user", content: prompt }],
                stream: false,
              }),
            },
          );
          if (geminiResp.ok) {
            const geminiJson = await geminiResp.json();
            const text = geminiJson?.choices?.[0]?.message?.content || "";
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            const items = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
            const validCategories = new Set(["brand_voice", "tagline", "motto", "mission", "values", "other"]);
            for (const item of items) {
              if (!item?.content || typeof item.content !== "string") continue;
              const category = validCategories.has(item.category) ? item.category : "other";
              await admin.from("client_asset_scrape_items").insert({
                scrape_id: scrapeId,
                kind: "text",
                suggested_category: category,
                suggested_label: String(item.label || "Scraped content").slice(0, 200),
                content: String(item.content).slice(0, 5000),
                status: "pending",
              });
              textCount++;
            }
          }
        } catch (err) {
          console.warn("Gemini extraction failed, continuing without text items:", err);
        }
      }

      await admin
        .from("client_asset_scrapes")
        .update({ status: "complete", completed_at: new Date().toISOString() })
        .eq("id", scrapeId);
      return json({ ok: true, scrapeId, imageCount, textCount }, 200, cors);
    } catch (err) {
      await admin
        .from("client_asset_scrapes")
        .update({
          status: "failed",
          error_message: err instanceof Error ? err.message : "Unknown error",
          completed_at: new Date().toISOString(),
        })
        .eq("id", scrapeId);
      return json({ ok: false, error: "Scrape failed", scrapeId }, 500, cors);
    }
  } catch (err) {
    console.error("[scrape-client-assets]", err);
    return json({ error: err instanceof Error ? err.message : "Unknown" }, 500, cors);
  }
});
