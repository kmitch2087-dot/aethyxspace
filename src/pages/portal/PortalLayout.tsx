import { useEffect, useState } from "react";
import { Outlet, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Seo from "@/components/Seo";
import { AlertCircle } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard,
  MessageSquare,
  FolderOpen,
  FileSignature,
  CreditCard,
  ClipboardList,
  LogOut,
  GitBranch,
  FolderKanban,
  Package,
  ListTodo,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const baseNavItems = [
  { title: "Overview", url: "/portal", icon: LayoutDashboard },
  { title: "Messages", url: "/portal/messages", icon: MessageSquare },
  { title: "Documents", url: "/portal/documents", icon: FolderOpen },
  { title: "Agreements", url: "/portal/agreements", icon: FileSignature },
  { title: "Payments", url: "/portal/payments", icon: CreditCard },
  { title: "Referrals", url: "/portal/referrals", icon: GitBranch },
  { title: "Add-Ons", url: "/portal/add-ons", icon: Package },
  { title: "My Project", url: "/portal/projects", icon: FolderKanban },
  { title: "Tasks", url: "/portal/tasks", icon: ListTodo },
];

function PortalSidebar({
  showIntake,
  showReferrals,
  badgeCounts,
}: {
  showIntake: boolean;
  showReferrals: boolean;
  badgeCounts: Record<string, number>;
}) {
  const filteredBase = showReferrals
    ? baseNavItems
    : baseNavItems.filter((item) => item.title !== "Referrals");
  const navItems = showIntake
    ? [...filteredBase, { title: "Intake Form", url: "/portal/intake", icon: ClipboardList }]
    : filteredBase;
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="flex flex-col h-full">
        <SidebarGroup>
          <SidebarGroupLabel className="font-display tracking-wider text-xs">
            {!collapsed && "Client Portal"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const badgeKey = item.title === "Documents" ? "documents"
                  : item.title === "Tasks" ? "tasks"
                  : item.title === "Agreements" ? "agreements"
                  : null;
                const badgeCount = badgeKey ? (badgeCounts[badgeKey] ?? 0) : 0;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === "/portal"}
                        className="hover:bg-muted/50"
                        activeClassName="bg-muted text-primary font-medium"
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                        {!collapsed && badgeCount > 0 && (
                          <span className="ml-auto rounded-full bg-primary text-primary-foreground text-[10px] leading-none px-1.5 py-1">
                            {badgeCount}
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="w-full justify-start text-muted-foreground hover:text-foreground"
          >
            <LogOut className="mr-2 h-4 w-4" />
            {!collapsed && "Sign Out"}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

const PortalLayout = () => {
  const { user } = useAuth();
  const [needsIntake, setNeedsIntake] = useState(false);
  const [referralEnabled, setReferralEnabled] = useState(false);
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({});

  // Notify admin once when an invited client first signs in.
  useEffect(() => {
    if (!user) return;
    const key = `portal-activation-notified:${user.id}`;
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, "1");
      supabase.functions.invoke("notify-portal-activation")
        .then(() => supabase.functions.invoke("dispatch-doc-event", { body: { event_name: "portal_activated" } }))
        .catch(() => sessionStorage.removeItem(key));
    }
    // Check intake status and referral access
    supabase.from("client_profiles")
      .select("intake_required, intake_completed_at, referral_enabled")
      .eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data && !data.intake_completed_at) setNeedsIntake(true);
        if (data?.referral_enabled) setReferralEnabled(true);
      });
  }, [user]);

  // Notification badge counts for Documents/Tasks/Agreements nav items. Separate effect from
  // the intake/referral check above so it can be reasoned about (and modified) independently.
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: profile } = await supabase
        .from("client_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!profile) return;

      const { data: seenRows } = await (supabase as any)
        .from("client_portal_seen_at")
        .select("item_type, last_seen_at")
        .eq("client_profile_id", profile.id);
      const seenMap: Record<string, string> = {};
      (seenRows ?? []).forEach((r: any) => { seenMap[r.item_type] = r.last_seen_at; });
      const epoch = "1970-01-01T00:00:00.000Z";

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [{ count: docsCount }, { data: agreementRow }, { data: plansData }] = await Promise.all([
        supabase
          .from("client_documents")
          .select("id", { count: "exact", head: true })
          .eq("client_profile_id", profile.id)
          .gt("created_at", seenMap.documents ?? epoch),
        (supabase as any)
          .from("client_agreement_records")
          .select("sent_at")
          .eq("client_profile_id", profile.id)
          .maybeSingle(),
        (supabase as any)
          .from("client_project_plans")
          .select("id")
          .eq("client_profile_id", profile.id),
      ]);

      const agreementUnseen =
        agreementRow?.sent_at && agreementRow.sent_at > (seenMap.agreements ?? epoch) ? 1 : 0;

      const planIds = (plansData ?? []).map((p: any) => p.id);
      let tasksUnseen = 0;
      if (planIds.length) {
        const dueSoonCutoff = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
        const [{ data: newTasks }, { data: dueSoonTasks }] = await Promise.all([
          (supabase as any)
            .from("client_project_tasks")
            .select("id")
            .in("plan_id", planIds)
            .eq("assigned_to", "client")
            .gt("created_at", seenMap.tasks ?? epoch),
          (supabase as any)
            .from("client_project_tasks")
            .select("id")
            .in("plan_id", planIds)
            .eq("assigned_to", "client")
            .neq("status", "complete")
            .lte("due_date", dueSoonCutoff),
        ]);
        const unseenIds = new Set([
          ...(newTasks ?? []).map((t: any) => t.id),
          ...(dueSoonTasks ?? []).map((t: any) => t.id),
        ]);
        tasksUnseen = unseenIds.size;
      }

      setBadgeCounts({
        documents: docsCount ?? 0,
        agreements: agreementUnseen,
        tasks: tasksUnseen,
      });
    })();
  }, [user]);

  return (
    <SidebarProvider>
      <Seo title="Client Portal | Aethyx" description="Aethyx client portal." noindex />
      <div className="min-h-screen flex w-full bg-transparent">
        <PortalSidebar showIntake={needsIntake} showReferrals={referralEnabled} badgeCounts={badgeCounts} />
        <div className="flex-1 flex flex-col">
          <header className="h-12 flex items-center border-b border-border/30 px-4">
            <SidebarTrigger />
            <span className="ml-4 font-display text-sm tracking-wider text-muted-foreground">
              Aethyx<span className="text-primary">.space</span> Portal
            </span>
          </header>
          {needsIntake && (
            <div className="bg-primary/10 border-b border-primary/30 px-6 py-3 flex items-center gap-3 text-sm">
              <AlertCircle className="h-4 w-4 text-primary shrink-0" />
              <span className="flex-1">
                Please complete your client intake form so we can start working together.
              </span>
              <Link to="/portal/intake" className="text-primary font-medium hover:underline whitespace-nowrap">
                Complete now →
              </Link>
            </div>
          )}
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default PortalLayout;
