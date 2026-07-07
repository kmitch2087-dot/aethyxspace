import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Circle, CalendarDays, AlertTriangle, TrendingUp, Minus } from "lucide-react";

type ScheduleStatus = "ahead" | "on_track" | "behind" | "no_date";

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

function calcSchedule(plan: any): { expectedPct: number; status: ScheduleStatus } {
  if (!plan.start_date || !plan.target_date) return { expectedPct: 0, status: "no_date" };
  const today = new Date().toISOString().slice(0, 10);
  const total = daysBetween(plan.start_date, plan.target_date);
  if (total <= 0) return { expectedPct: 100, status: "on_track" };
  const elapsed = daysBetween(plan.start_date, today);
  const expectedPct = Math.min(100, Math.round((elapsed / total) * 100));
  const delta = (plan.completion_percent ?? 0) - expectedPct;
  const status: ScheduleStatus = delta >= 5 ? "ahead" : delta <= -10 ? "behind" : "on_track";
  return { expectedPct, status };
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtDateLong(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

const statusColors: Record<string, string> = {
  planning: "bg-white/10 text-white/60",
  active: "bg-teal-500/20 text-teal-400",
  review: "bg-purple-500/20 text-purple-400",
  complete: "bg-green-500/20 text-green-400",
  paused: "bg-amber-500/20 text-amber-400",
};

const phaseColors: Record<string, string> = {
  pending: "bg-white/10 text-white/50",
  in_progress: "bg-teal-500/20 text-teal-400",
  complete: "bg-green-500/20 text-green-400",
};

const priorityColors: Record<string, string> = {
  high: "bg-red-500/20 text-red-400",
  normal: "bg-teal-500/20 text-teal-400",
  low: "bg-white/10 text-white/50",
};

const scheduleColors: Record<ScheduleStatus, string> = {
  ahead: "text-green-400",
  on_track: "text-teal-400",
  behind: "text-red-400",
  no_date: "text-white/40",
};

const scheduleLabels: Record<ScheduleStatus, string> = {
  ahead: "Ahead of Schedule",
  on_track: "On Track",
  behind: "Behind Schedule",
  no_date: "No dates set",
};

const ScheduleIcon = ({ status }: { status: ScheduleStatus }) => {
  if (status === "ahead") return <TrendingUp className="h-4 w-4" />;
  if (status === "behind") return <AlertTriangle className="h-4 w-4" />;
  return <Minus className="h-4 w-4" />;
};

export default function PortalProjects() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<any>(null);
  const [phases, setPhases] = useState<any[]>([]);
  const [updates, setUpdates] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [completing, setCompleting] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    load();
  }, [user]);

  async function load() {
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from("client_profiles")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (!profile) { setLoading(false); return; }

      const { data: planData } = await (supabase as any)
        .from("client_project_plans")
        .select("*")
        .eq("client_profile_id", profile.id)
        .maybeSingle();

      if (!planData) { setLoading(false); return; }

      setPlan(planData);

      const [{ data: phasesData }, { data: updatesData }, { data: tasksData }] = await Promise.all([
        (supabase as any)
          .from("client_project_phases")
          .select("*")
          .eq("plan_id", planData.id)
          .order("sort_order"),
        (supabase as any)
          .from("client_project_updates")
          .select("*")
          .eq("plan_id", planData.id)
          .eq("is_client_visible", true)
          .order("created_at", { ascending: false }),
        (supabase as any)
          .from("client_project_tasks")
          .select("*")
          .eq("plan_id", planData.id)
          .eq("assigned_to", "client")
          .order("sort_order"),
      ]);

      setPhases(phasesData ?? []);
      setUpdates(updatesData ?? []);
      setTasks(tasksData ?? []);
    } catch {
      toast({ title: "Failed to load project", variant: "destructive" });
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

  const { status, expectedPct } = plan ? calcSchedule(plan) : { status: "no_date" as ScheduleStatus, expectedPct: 0 };
  const completionPct = plan?.completion_percent ?? 0;
  const clientTasks = tasks.filter((t) => t.assigned_to === "client");

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Your Project</h1>
        {plan?.project_name && (
          <p className="text-white/50 text-sm mt-1">{plan.project_name}</p>
        )}
      </div>

      {!plan ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
          <p className="text-white/60">
            Your project plan isn't set up yet. We'll add it once your project kicks off.
          </p>
        </div>
      ) : (
        <>
          {/* Section 1 — Overview */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h2 className="text-xl font-bold text-white">{plan.project_name ?? "Project"}</h2>
                {plan.status && (
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[plan.status] ?? "bg-white/10 text-white/60"}`}>
                    {plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
                  </span>
                )}
                {plan.overview && (
                  <p className="text-white/60 text-sm leading-relaxed">{plan.overview}</p>
                )}
              </div>

              <div className="flex flex-col items-start md:items-end gap-3">
                <span className="text-5xl font-bold text-white tabular-nums">{completionPct}%</span>
                <div className="w-full max-w-xs">
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-500 rounded-full transition-all duration-500"
                      style={{ width: `${completionPct}%` }}
                    />
                  </div>
                </div>
                <span className={`flex items-center gap-1.5 text-sm font-medium ${scheduleColors[status]}`}>
                  <ScheduleIcon status={status} />
                  {scheduleLabels[status]}
                </span>
              </div>
            </div>

            {(plan.start_date || plan.target_date) && (
              <div className="flex items-center gap-2 text-sm text-white/50 pt-2 border-t border-white/10">
                <CalendarDays className="h-4 w-4 shrink-0" />
                <span>
                  {plan.start_date && <>Started: {fmtDate(plan.start_date)}</>}
                  {plan.start_date && plan.target_date && " · "}
                  {plan.target_date && <>Due: {fmtDate(plan.target_date)}</>}
                </span>
              </div>
            )}
          </div>

          {/* Section 2 — Phases */}
          {phases.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
              <h2 className="text-base font-semibold text-white">Project Phases</h2>
              <div className="space-y-4">
                {phases.map((phase) => {
                  const pct = phase.completion_percent ?? 0;
                  return (
                    <div key={phase.id} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-white font-medium">{phase.name}</span>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${phaseColors[phase.status] ?? "bg-white/10 text-white/50"}`}>
                            {phase.status === "in_progress" ? "In Progress" : phase.status ? phase.status.charAt(0).toUpperCase() + phase.status.slice(1) : "Pending"}
                          </span>
                          <span className="text-xs text-white/50 tabular-nums w-8 text-right">{pct}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-500/70 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 3 — Client tasks */}
          {clientTasks.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
              <div>
                <h2 className="text-base font-semibold text-white">Action Items for You</h2>
                <p className="text-sm text-white/50 mt-0.5">
                  These items are waiting on you before we can move forward.
                </p>
              </div>
              <div className="space-y-3">
                {clientTasks.map((task) => {
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
            </div>
          )}

          {/* Section 4 — Updates */}
          {updates.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
              <div>
                <h2 className="text-base font-semibold text-white">Latest Updates</h2>
                <p className="text-sm text-white/50 mt-0.5">From the Aethyx team</p>
              </div>
              <div className="space-y-4">
                {updates.map((update) => (
                  <div key={update.id} className="border-l-2 border-teal-500/40 pl-4 space-y-1">
                    <p className="text-xs text-white/40">{fmtDateLong(update.created_at)}</p>
                    <p className="text-sm text-white/80 leading-relaxed">{update.content}</p>
                    {update.author_name && (
                      <p className="text-xs text-white/40">— {update.author_name}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
