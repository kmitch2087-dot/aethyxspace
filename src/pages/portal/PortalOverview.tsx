import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePortalClientProfile } from "@/hooks/usePortalClientProfile";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, MessageSquare, FolderOpen } from "lucide-react";

const PortalOverview = () => {
  const { user } = useAuth();
  const { profile: resolvedProfile } = usePortalClientProfile();
  const [profile, setProfile] = useState<any>(null);
  const [msgCount, setMsgCount] = useState(0);
  const [docCount, setDocCount] = useState(0);

  useEffect(() => {
    if (!user || !resolvedProfile) return;
    const load = async () => {
      const profileData = resolvedProfile;
      setProfile(profileData);
      const pid = profileData?.id;
      const msgFilter = pid ? `client_profile_id.eq.${pid},user_id.eq.${user.id}` : `user_id.eq.${user.id}`;
      const docFilter = pid ? `client_profile_id.eq.${pid},user_id.eq.${user.id}` : `user_id.eq.${user.id}`;
      const [msgRes, docRes] = await Promise.all([
        supabase.from("client_messages").select("id").or(msgFilter),
        supabase.from("client_documents").select("id").or(docFilter),
      ]);
      setMsgCount((msgRes.data || []).length);
      setDocCount((docRes.data || []).length);
    };
    load();
  }, [user, resolvedProfile]);

  return (
    <div>
      <h1 className="text-2xl font-display tracking-wider mb-2">
        Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}!
      </h1>
      <p className="text-muted-foreground mb-8">
        This is your client portal. Here you can communicate with our team, view documents, & manage your project.
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Profile</CardTitle>
            <User className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-sm">{profile?.business_name || "No business name set"}</p>
            <p className="text-xs text-muted-foreground mt-1">{user?.email}</p>
          </CardContent>
        </Card>

        <Card className="border-border/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{msgCount}</div>
            <p className="text-xs text-muted-foreground mt-1">messages sent</p>
          </CardContent>
        </Card>

        <Card className="border-border/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Documents</CardTitle>
            <FolderOpen className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{docCount}</div>
            <p className="text-xs text-muted-foreground mt-1">files available</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PortalOverview;
