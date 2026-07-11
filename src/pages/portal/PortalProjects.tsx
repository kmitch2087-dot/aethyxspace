import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CalendarDays, AlertTriangle, TrendingUp, Minus } from "lucide-react";

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
  const [plans, setPlans] = useState<any[]>([]);
  const [phases, setPhases] = useState<any[]>([]);
  const [updates, setUpdates] = useState<any[]>([]);

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

      const { data: plansData } = await (supabase as any)
        .from("client_project_plans")
        .select("*")
        .eq("client_profile_id", profile.id)
        .order("created_at");

      if (!plansData?.length) { setLoading(false); return; }

      setPlans(plansData);

      const planIds = plansData.map((p: any) => p.id);
      const [{ data: phasesData }, { data: updatesData }] = await Promise.all([
        (supabase as any)
          .from("client_project_phases")
          .select("*")
          .in("plan_id", planIds)
          .order("sort_order"),
        (supabase as any)
          .from("client_project_updates")
          .select("*")
          .in("plan_id", planIds)
          .eq("is_client_visible", true)
          .order("created_at", { ascending: false }),
      ]);

      setPhases(phasesData ?? []);
      setUpdates(updatesData ?? []);
    } catch {
      toast({ title: "Failed to load project", variant: "destructive" });
    } finally {
      setLoading(false);
    }
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
        <h1 className="text-2xl font-bold text-white">Your Project</h1>
      </div>

      {plans.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
          <p className="text-white/60">
            Your project plan isn't set up yet. We'll add it once your project kicks off.
          </p>
        </div>
      ) : (
        plans.map((plan) => {
          const { status, expectedPct } = calcSchedule(plan);
          const completionPct = plan?.completion_percent ?? 0;
          const planPhases = phases.filter((p) => p.plan_id === plan.id);
          const planUpdates = updates.filter((u) => u.plan_id === plan.id);

          return (
            <div key={plan.id} className="space-y-6">
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
              {planPhases.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
                  <h2 className="text-base font-semibold text-white">Project Phases</h2>
                  <div className="space-y-4">
                    {planPhases.map((phase) => {
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

              {/* Section 3 — Updates */}
              {planUpdates.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
                  <div>
                    <h2 className="text-base font-semibold text-white">Latest Updates</h2>
                    <p className="text-sm text-white/50 mt-0.5">From the Aethyx team</p>
                  </div>
                  <div className="space-y-4">
                    {planUpdates.map((update) => (
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
            </div>
          );
        })
      )}
    </div>
  );
}
