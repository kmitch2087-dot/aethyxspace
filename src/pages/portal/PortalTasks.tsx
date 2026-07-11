import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePortalClientProfile } from "@/hooks/usePortalClientProfile";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Circle, ListTodo } from "lucide-react";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const priorityColors: Record<string, string> = {
  high: "bg-red-500/20 text-red-400",
  normal: "bg-teal-500/20 text-teal-400",
  low: "bg-white/10 text-white/50",
};

export default function PortalTasks() {
  const { user } = useAuth();
  const { profile: resolvedProfile, loading: profileLoading } = usePortalClientProfile();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [completing, setCompleting] = useState<string | null>(null);

  useEffect(() => {
    if (!user || profileLoading) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, resolvedProfile, profileLoading]);

  async function load() {
    setLoading(true);
    try {
      const profile = resolvedProfile;

      if (!profile) { setLoading(false); return; }

      const { data: plansData } = await (supabase as any)
        .from("client_project_plans")
        .select("id")
        .eq("client_profile_id", profile.id);

      const planIds = (plansData ?? []).map((p: any) => p.id);
      if (!planIds.length) { setTasks([]); setLoading(false); return; }

      const { data: tasksData } = await (supabase as any)
        .from("client_project_tasks")
        .select("*")
        .in("plan_id", planIds)
        .eq("assigned_to", "client")
        .order("sort_order");

      setTasks(tasksData ?? []);

      (supabase as any)
        .from("client_portal_seen_at")
        .upsert(
          { client_profile_id: profile.id, item_type: "tasks", last_seen_at: new Date().toISOString() },
          { onConflict: "client_profile_id,item_type" },
        )
        .then(() => {});
    } catch {
      toast({ title: "Failed to load tasks", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function markTaskComplete(taskId: string) {
    setCompleting(taskId);
    const { error } = await (supabase as any)
      .from("client_project_tasks")
      .update({ status: "complete" })
      .eq("id", taskId);

    if (error) {
      toast({ title: "Could not update task", variant: "destructive" });
    } else {
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: "complete" } : t));
      toast({ title: "Task marked complete" });
    }
    setCompleting(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-6 h-6 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Tasks</h1>
        <p className="text-white/50 text-sm mt-1">Action items waiting on you across your projects.</p>
      </div>

      {tasks.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
          <ListTodo className="h-8 w-8 text-white/20 mx-auto mb-3" />
          <p className="text-white/60">No tasks right now — check back soon.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const done = task.status === "complete";
            return (
              <div
                key={task.id}
                className={`bg-white/5 border border-white/10 rounded-lg p-4 flex gap-4 items-start transition-opacity ${done ? "opacity-60" : ""}`}
              >
                <button
                  onClick={() => !done && markTaskComplete(task.id)}
                  disabled={done || completing === task.id}
                  className="mt-0.5 shrink-0 text-white/40 hover:text-teal-400 disabled:cursor-default disabled:hover:text-white/40 transition-colors"
                  aria-label={done ? "Task complete" : "Mark complete"}
                >
                  {done ? (
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                  ) : completing === task.id ? (
                    <div className="w-5 h-5 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </button>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {task.priority && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[task.priority] ?? "bg-white/10 text-white/50"}`}>
                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                      </span>
                    )}
                    <span className={`text-sm font-semibold ${done ? "line-through text-white/40" : "text-white"}`}>
                      {task.title}
                    </span>
                  </div>
                  {task.description && (
                    <p className="text-xs text-white/50 leading-relaxed">{task.description}</p>
                  )}
                  {task.due_date && (
                    <p className="text-xs text-white/40">Due: {fmtDate(task.due_date)}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
