// GitHub push webhook → logs commit updates to client_project_updates
// Verifies HMAC-SHA256 via GITHUB_WEBHOOK_SECRET.
//
// Matching: first tries github_url on the plan; falls back to fuzzy project_name match.
//
// Commit message format (optional — plain commits still log):
//   [project-name] Your description here #done|#note|#blocker|#milestone

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

async function verifySignature(secret: string, sig: string | null, body: string): Promise<boolean> {
  if (!sig?.startsWith("sha256=")) return false;
  const expected = sig.slice(7);
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const actual = Array.from(new Uint8Array(mac)).map(b => b.toString(16).padStart(2, "0")).join("");
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

function norm(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, ""); }

function fuzzyMatchPlan(
  name: string,
  plans: Array<{ id: string; project_name: string; client_profile_id: string }>,
) {
  const target = norm(name);
  if (!target) return null;
  return (
    plans.find(p => norm(p.project_name) === target) ??
    plans.find(p => norm(p.project_name).includes(target) || target.includes(norm(p.project_name))) ??
    null
  );
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const secret = Deno.env.get("GITHUB_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret || !supabaseUrl || !serviceKey) return new Response("Server misconfigured", { status: 500 });

  const body = await req.text();
  if (!await verifySignature(secret, req.headers.get("x-hub-signature-256"), body)) {
    return new Response("Invalid signature", { status: 401 });
  }

  const event = req.headers.get("x-github-event") ?? "";
  if (event === "ping") return new Response(JSON.stringify({ ok: true, pong: true }), { headers: { "Content-Type": "application/json" } });
  if (event !== "push") return new Response(JSON.stringify({ ok: true, ignored: event }), { headers: { "Content-Type": "application/json" } });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let payload: any;
  try { payload = JSON.parse(body); } catch { return new Response("Invalid JSON", { status: 400 }); }

  const commits: Array<{ id: string; message: string; url?: string }> = payload.commits ?? [];
  if (!commits.length) return new Response(JSON.stringify({ ok: true, processed: 0 }), { headers: { "Content-Type": "application/json" } });

  const admin = createClient(supabaseUrl, serviceKey);
  const repoUrl: string = payload.repository?.html_url ?? "";
  const repoName: string = payload.repository?.full_name ?? "unknown";
  const branch: string = (payload.ref ?? "refs/heads/main").replace("refs/heads/", "");
  const pusher: string = payload.pusher?.name ?? "GitHub";

  // Find matching plan: github_url match first, then fetch all for fuzzy match
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let plan: { id: string; project_name: string; client_profile_id: string } | null = null;

  if (repoUrl) {
    const { data: byUrl } = await admin
      .from("client_project_plans")
      .select("id, project_name, client_profile_id")
      .or(`github_url.eq.${repoUrl},github_url.eq.${repoUrl}.git`)
      .maybeSingle();
    plan = byUrl ?? null;
  }

  if (!plan) {
    // Try to find by commit message project-name prefix: [project-name]
    const firstMsg = commits[0]?.message ?? "";
    const nameMatch = firstMsg.match(/^\[([^\]]+)\]/);
    if (nameMatch) {
      const { data: allPlans } = await admin
        .from("client_project_plans")
        .select("id, project_name, client_profile_id");
      plan = fuzzyMatchPlan(nameMatch[1], allPlans ?? []);
    }
  }

  if (!plan) {
    console.warn("[github-webhook] no plan matched for repo", repoUrl || repoName);
    return new Response(JSON.stringify({ ok: true, processed: 0, reason: "no matching project plan" }), { headers: { "Content-Type": "application/json" } });
  }

  // Build a single update entry summarising all commits
  const lines = commits.slice(0, 8).map(c => `• ${c.message.split("\n")[0].trim()}`);
  const more = commits.length - 8;
  let content = `🔀 ${commits.length} commit${commits.length !== 1 ? "s" : ""} pushed to \`${branch}\` by ${pusher} (${repoName}):\n${lines.join("\n")}`;
  if (more > 0) content += `\n…and ${more} more`;

  const { error } = await admin.from("client_project_updates").insert({
    plan_id: plan.id,
    content,
    author: "GitHub",
    is_client_visible: false,
  });

  if (error) {
    console.error("[github-webhook] insert update", error);
    return new Response("DB error", { status: 500 });
  }

  console.log(`[github-webhook] logged ${commits.length} commits to plan ${plan.id} (${plan.project_name})`);
  return new Response(JSON.stringify({ ok: true, processed: commits.length, plan_id: plan.id }), { headers: { "Content-Type": "application/json" } });
});
