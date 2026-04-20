import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
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
import { useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  Star,
  FileSignature,
  DollarSign,
  Users,
  FolderOpen,
  Image as ImageIcon,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Blog", url: "/admin/blog", icon: FileText },
  { title: "Inquiries", url: "/admin/inquiries", icon: MessageSquare },
  { title: "Reviews", url: "/admin/reviews", icon: Star },
  { title: "Agreements", url: "/admin/agreements", icon: FileSignature },
  { title: "Financials", url: "/admin/financials", icon: DollarSign },
  { title: "Clients", url: "/admin/clients", icon: Users },
  { title: "Documents", url: "/admin/documents", icon: FolderOpen },
  { title: "Media", url: "/admin/media", icon: ImageIcon },
];

function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/admin/login");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="flex flex-col h-full">
        <SidebarGroup>
          <SidebarGroupLabel className="font-display tracking-wider text-xs">
            {!collapsed && "Admin Panel"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/admin"}
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

const AdminLayout = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-transparent">
        <AdminSidebar />
        <div className="flex-1 flex flex-col bg-white text-black">
          <header className="h-12 flex items-center border-b border-black/10 px-4 bg-white">
            <SidebarTrigger className="text-black hover:bg-black/5" />
            <span className="ml-4 font-display text-sm tracking-wider text-black/60">
              Aethyx<span className="text-primary">.space</span> Admin
            </span>
          </header>
          <main className="flex-1 p-6 bg-white text-black [&_*]:!border-black/10">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
