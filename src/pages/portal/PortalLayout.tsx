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
} from "lucide-react";
import { Button } from "@/components/ui/button";

const baseNavItems = [
  { title: "Overview", url: "/portal", icon: LayoutDashboard },
  { title: "Messages", url: "/portal/messages", icon: MessageSquare },
  { title: "Documents", url: "/portal/documents", icon: FolderOpen },
  { title: "Agreements", url: "/portal/agreements", icon: FileSignature },
  { title: "Payments", url: "/portal/payments", icon: CreditCard },
];

function PortalSidebar({ showIntake }: { showIntake: boolean }) {
  const navItems = showIntake
    ? [...baseNavItems, { title: "Intake Form", url: "/portal/intake", icon: ClipboardList }]
    : baseNavItems;
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
              {navItems.map((item) => (
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
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
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
    // Check intake status
    supabase.from("client_profiles")
      .select("intake_required, intake_completed_at")
      .eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data && !data.intake_completed_at) setNeedsIntake(true);
      });
  }, [user]);

  return (
    <SidebarProvider>
      <Seo title="Client Portal | Aethyx" description="Aethyx client portal." noindex />
      <div className="min-h-screen flex w-full bg-transparent">
        <PortalSidebar showIntake={needsIntake} />
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
