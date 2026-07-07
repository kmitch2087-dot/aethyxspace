import React, { useEffect, useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ArrowRight, Calendar } from "lucide-react"

interface ProjectPlan {
  id: string
  client_profile_id: string
  project_name: string
  overview?: string
  completion_percent: number
  status: "planning" | "active" | "review" | "complete" | "paused"
  start_date?: string
  target_date?: string
  created_at: string
  updated_at: string
  client_profiles?: {
    id: string
    full_name: string
    company_name?: string
    email: string
  }
}

interface ProjectPhase {
  id: string
  plan_id: string
  name: string
  completion_percent: number
  status: "pending" | "in_progress" | "complete"
  sort_order: number
}

type ScheduleStatus = "ahead" | "on_track" | "behind" | "no_date" | "complete" | "paused"
type StatusFilter = "all" | "planning" | "active" | "review" | "complete" | "paused"

function daysBetween(a: string, b: string): number {
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / msPerDay)
}

function getScheduleStatus(project: ProjectPlan): ScheduleStatus {
  if (project.status === "complete") return "complete"
  if (project.status === "paused") return "paused"
  if (!project.start_date || !project.target_date) return "no_date"

  const today = new Date().toISOString().split("T")[0]
  const totalDays = daysBetween(project.start_date, project.target_date)

  if (totalDays <= 0) return "no_date"

  const elapsedDays = daysBetween(project.start_date, today)
  const expectedPct = Math.min(100, Math.round((elapsedDays / totalDays) * 100))
  const delta = project.completion_percent - expectedPct

  if (delta >= 5) return "ahead"
  if (delta <= -10) return "behind"
  return "on_track"
}

const scheduleBadgeConfig: Record<ScheduleStatus, { label: string; className: string }> = {
  ahead: { label: "Ahead", className: "bg-green-100 text-green-800" },
  on_track: { label: "On Track", className: "bg-teal-100 text-teal-800" },
  behind: { label: "Behind", className: "bg-red-100 text-red-800" },
  no_date: { label: "No Date", className: "bg-gray-100 text-gray-500" },
  complete: { label: "Complete", className: "bg-gray-100 text-gray-500" },
  paused: { label: "Paused", className: "bg-amber-100 text-amber-800" },
}

const statusBadgeConfig: Record<ProjectPlan["status"], { label: string; className: string }> = {
  planning: { label: "Planning", className: "bg-gray-100 text-gray-700" },
  active: { label: "Active", className: "bg-teal-100 text-teal-800" },
  review: { label: "Review", className: "bg-purple-100 text-purple-800" },
  complete: { label: "Complete", className: "bg-green-100 text-green-800" },
  paused: { label: "Paused", className: "bg-amber-100 text-amber-800" },
}

function ScheduleBadge({ status }: { status: ScheduleStatus }) {
  const { label, className } = scheduleBadgeConfig[status]
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}

function StatusBadge({ status }: { status: ProjectPlan["status"] }) {
  const { label, className } = statusBadgeConfig[status]
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

const filterButtons: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Planning", value: "planning" },
  { label: "Active", value: "active" },
  { label: "Review", value: "review" },
  { label: "Complete", value: "complete" },
  { label: "Paused", value: "paused" },
]

export default function Projects() {
  const [projects, setProjects] = useState<ProjectPlan[]>([])
  const [phases, setPhases] = useState<ProjectPhase[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [showComplete, setShowComplete] = useState(false)
  const { toast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      const [{ data: planData, error: planError }, { data: phaseData, error: phaseError }] =
        await Promise.all([
          (supabase as any)
            .from("client_project_plans")
            .select("*")
            .order("updated_at", { ascending: false }),
          (supabase as any)
            .from("client_project_phases")
            .select("*")
            .order("sort_order"),
        ])

      if (planError) {
        toast({ title: "Error loading projects", variant: "destructive" })
        setLoading(false)
        return
      }

      const plans = planData ?? []
      const profileIds = [...new Set(plans.map((p: any) => p.client_profile_id as string))]
      let profileMap = new Map<string, any>()
      if (profileIds.length > 0) {
        const { data: profileData } = await (supabase as any)
          .from("client_profiles")
          .select("id, full_name, company_name, email")
          .in("id", profileIds)
        profileMap = new Map((profileData ?? []).map((p: any) => [p.id, p]))
      }

      setProjects(plans.map((p: any) => ({ ...p, client_profiles: profileMap.get(p.client_profile_id) })))

      if (!phaseError) {
        setPhases(phaseData ?? [])
      }

      setLoading(false)
    }

    fetchData()
  }, [toast])

  const phasesByPlanId = useMemo(() => {
    const map = new Map<string, ProjectPhase[]>()
    for (const phase of phases) {
      if (!map.has(phase.plan_id)) map.set(phase.plan_id, [])
      map.get(phase.plan_id)!.push(phase)
    }
    return map
  }, [phases])

  const filteredProjects = useMemo(() => {
    if (statusFilter !== "all") return projects.filter((p) => p.status === statusFilter)
    if (showComplete) return projects
    return projects.filter((p) => p.status !== "complete")
  }, [projects, statusFilter, showComplete])

  const activeCount = projects.filter((p) => p.status === "active").length

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        <p className="text-sm text-gray-500 mt-1">
          {activeCount} active project{activeCount !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {filterButtons.map((btn) => (
          <Button
            key={btn.value}
            variant={statusFilter === btn.value ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(btn.value)}
            className={
              statusFilter === btn.value
                ? "bg-gray-900 text-white hover:bg-gray-800"
                : "text-gray-700 border-gray-200"
            }
          >
            {btn.label}
          </Button>
        ))}
        {statusFilter === "all" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowComplete((v) => !v)}
            className="text-gray-400 hover:text-gray-600 ml-2"
          >
            {showComplete ? "Hide completed" : "+ Show completed"}
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 py-12 text-center">Loading projects…</div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">
            No active projects yet. Create a project plan from a client's profile.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => {
            const scheduleStatus = getScheduleStatus(project)
            const projectPhases = phasesByPlanId.get(project.id) ?? []
            const completePhases = projectPhases.filter((ph) => ph.status === "complete").length
            const clientName = project.client_profiles?.full_name ?? "Unknown client"

            return (
              <div
                key={project.id}
                className="rounded-lg border border-gray-200 bg-white p-4 flex flex-col gap-3 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-500 font-medium truncate">{clientName}</span>
                  <ScheduleBadge status={scheduleStatus} />
                </div>

                <p className="font-semibold text-gray-900 text-sm leading-snug">
                  {project.project_name}
                </p>

                <div className="flex items-center gap-2">
                  <StatusBadge status={project.status} />
                  <span className="text-xs text-gray-500 ml-auto font-medium">
                    {project.completion_percent}%
                  </span>
                </div>

                <Progress
                  value={project.completion_percent}
                  className="h-1.5 bg-gray-100 [&>div]:bg-teal-500"
                />

                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Calendar className="h-3 w-3 shrink-0" />
                  {project.target_date ? (
                    <span>Due: {formatDate(project.target_date)}</span>
                  ) : (
                    <span>No target date set</span>
                  )}
                </div>

                <div className="text-xs text-gray-500">
                  {projectPhases.length > 0
                    ? `${completePhases} of ${projectPhases.length} phase${projectPhases.length !== 1 ? "s" : ""} complete`
                    : "No phases defined"}
                </div>

                <button
                  onClick={() => navigate(`/admin/clients/${project.client_profile_id}`)}
                  className="text-xs text-teal-700 hover:text-teal-900 font-medium flex items-center gap-1 mt-auto pt-1"
                >
                  View Plan <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
