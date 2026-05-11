// GitHub push webhook -> updates project_tasks & project_updates
// Public endpoint; verifies HMAC-SHA256 signature with GITHUB_WEBHOOK_SECRET.
//
// Commit message format:
//   [project-name] description #tag
// Tags: #done, #progress, #note, #blocker, #milestone
// Optional task ref: include `#task-<uuid>` to update a specific task.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const TAG_KIND_MAP: Record<string, "note" | "blocker" | "milestone"> = {
  note: "note",
  blocker: "blocker",
  milestone: "milestone",
};
const TASK_STATUS_TAGS = new Set(["done", "progress"]);
const ALL_TAGS = new Set(["done", "progress", "note", "blocker", "milestone"]);

interface ParsedCommit {
  projectName: string;
  description: string;
  tag: string;
  taskId: string | null;
}

function parseCommitMessage(message: string): ParsedCommit | null {
  if (!message) return null;
  // Use only the first line (commit subject)
  const subject = message.split("\n")[0].trim();

  const projectMatch = subject.match(/^\[([^\]]+)\]\s*(.*)$/);
  if (!projectMatch) return null;
  const projectName = projectMatch[1].trim();
  let rest = projectMatch[2].trim();

  // Optional task id reference
  let taskId: string | null = null;
  const taskMatch = rest.match(
    /#task-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
  );
  if (taskMatch) {
    taskId = taskMatch[1];
    rest = rest.replace(taskMatch[0], "").trim();
  }

  // Find a known tag
  const tagMatches = [...rest.matchAll(/#([a-zA-Z]+)/g)];
  let tag: string | null = null;
  for (const m of tagMatches) {
    const t = m[1].toLowerCase();
    if (ALL_TAGS.has(t)) {
      tag = t;
      rest = rest.replace(m[0], "").trim();
      break;
    }
  }
  if (!tag) return null;

  const description = rest.replace(/\s+/g, " ").trim();
  if (!description && !taskId) return null;

  return { projectName, description, tag, taskId };
}

async function verifySignature(
  secret: string,
  signature: string | null,
  body: string,
): Promise<boolean> {
  if (!signature || !signature.startsWith("sha256=")) return false;
  const expectedHex = signature.slice(7);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body),
  );
  const macHex = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  // constant-time compare
  if (macHex.length !== expectedHex.length) return false;
  let diff = 0;
  for (let i = 0; i < macHex.length; i++) {
    diff |= macHex.charCodeAt(i) ^ expectedHex.charCodeAt(i);
  }
  return diff === 0;
}

function fuzzyMatchProject(
  name: string,
  projects: { id: string; name: string; client_profile_id: string }[],
) {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const target = norm(name);
  if (!target) return null;
  // exact normalized
  let p = projects.find((x) => norm(x.name) === target);
  if (p) return p;
  // contains either way
  p = projects.find(
    (x) => norm(x.name).includes(target) || target.includes(norm(x.name)),
  );
  return p ?? null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const secret = Deno.env.get("GITHUB_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret || !supabaseUrl || !serviceKey) {
    console.error("[github-webhook] missing env");
    return new Response("Server misconfigured", { status: 500 });
  }

  const body = await req.text();
  const sig = req.headers.get("x-hub-signature-256");
  const ok = await verifySignature(secret, sig, body);
  if (!ok) {
    return new Response("Invalid signature", { status: 401 });
  }

  const event = req.headers.get("x-github-event") ?? "";
  if (event === "ping") {
    return new Response(JSON.stringify({ ok: true, pong: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }
  if (event !== "push") {
    return new Response(JSON.stringify({ ok: true, ignored: event }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  let payload: any;
  try {
    payload = JSON.parse(body);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const commits: Array<{ id: string; message: string; url?: string; author?: any }> =
    payload.commits ?? [];
  if (!commits.length) {
    return new Response(JSON.stringify({ ok: true, processed: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: projects, error: projErr } = await admin
    .from("client_projects")
    .select("id, name, client_profile_id");
  if (projErr) {
    console.error("[github-webhook] projects fetch", projErr);
    return new Response("DB error", { status: 500 });
  }

  const repoName: string = payload.repository?.full_name ?? "unknown";
  const pusher: string = payload.pusher?.name ?? "github";
  const results: Array<Record<string, unknown>> = [];

  for (const commit of commits) {
    const parsed = parseCommitMessage(commit.message);
    if (!parsed) {
      results.push({ commit: commit.id, skipped: "no-tag" });
      continue;
    }
    const project = fuzzyMatchProject(parsed.projectName, projects ?? []);
    if (!project) {
      results.push({ commit: commit.id, skipped: "no-project-match", projectName: parsed.projectName });
      continue;
    }

    const basePayload = {
      commit_id: commit.id,
      commit_url: commit.url ?? null,
      repo: repoName,
      pusher,
      raw_message: commit.message,
      parsed,
    };
    const summaryBase = parsed.description || `(${parsed.tag})`;

    try {
      if (TASK_STATUS_TAGS.has(parsed.tag)) {
        const newStatus = parsed.tag === "done" ? "done" : "in_progress";
        let taskId = parsed.taskId;

        if (taskId) {
          // Update existing task (scoped to matched project)
          const update: Record<string, unknown> = { status: newStatus };
          if (newStatus === "done") update.completed_at = new Date().toISOString();
          if (parsed.description) update.description = parsed.description;
          const { data: updated, error: upErr } = await admin
            .from("project_tasks")
            .update(update)
            .eq("id", taskId)
            .eq("project_id", project.id)
            .select("id")
            .maybeSingle();
          if (upErr || !updated) {
            // fall through to create new
            taskId = null;
          }
        }

        if (!taskId) {
          const insertRow: Record<string, unknown> = {
            project_id: project.id,
            client_profile_id: project.client_profile_id,
            title: parsed.description.slice(0, 200) || `Commit ${commit.id.slice(0, 7)}`,
            status: newStatus,
            assignee: "admin",
            created_by: "github",
            source: "github",
          };
          if (newStatus === "done") insertRow.completed_at = new Date().toISOString();
          const { data: ins, error: insErr } = await admin
            .from("project_tasks")
            .insert(insertRow)
            .select("id")
            .single();
          if (insErr) throw insErr;
          taskId = ins.id;
        }

        await admin.from("project_updates").insert({
          project_id: project.id,
          client_profile_id: project.client_profile_id,
          kind: newStatus === "done" ? "status_change" : "note",
          summary: `[${parsed.tag}] ${summaryBase}`.slice(0, 5000),
          payload: { ...basePayload, task_id: taskId },
          created_by: "github",
        });

        results.push({ commit: commit.id, project: project.name, tag: parsed.tag, task_id: taskId });
      } else {
        const kind = TAG_KIND_MAP[parsed.tag] ?? "note";
        const { error: updErr } = await admin.from("project_updates").insert({
          project_id: project.id,
          client_profile_id: project.client_profile_id,
          kind,
          summary: summaryBase.slice(0, 5000),
          payload: basePayload,
          created_by: "github",
        });
        if (updErr) throw updErr;
        results.push({ commit: commit.id, project: project.name, tag: parsed.tag, kind });
      }
    } catch (err) {
      console.error("[github-webhook] commit error", commit.id, err);
      results.push({ commit: commit.id, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return new Response(
    JSON.stringify({ ok: true, processed: results.length, results }),
    { headers: { "Content-Type": "application/json" } },
  );
});
