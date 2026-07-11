import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePortalClientProfile } from "@/hooks/usePortalClientProfile";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { User, MessageSquare, FolderOpen, Loader2 } from "lucide-react";

const PortalOverview = () => {
  const { user } = useAuth();
  const { profile: resolvedProfile, isViewingAsAdmin } = usePortalClientProfile();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [msgCount, setMsgCount] = useState(0);
  const [docCount, setDocCount] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editBusinessName, setEditBusinessName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user || !resolvedProfile) return;
    const profileData = resolvedProfile;
    setProfile(profileData);
    const pid = profileData?.id;
    const msgFilter = pid ? `client_profile_id.eq.${pid},user_id.eq.${user.id}` : `user_id.eq.${user.id}`;
    const docFilter = pid ? `client_profile_id.eq.${pid},user_id.eq.${user.id}` : `user_id.eq.${user.id}`;
    // Documents count must match ClientDetail.tsx's admin-side count: generic shared
    // documents (client_documents) PLUS anything uploaded via the project document-slots
    // flow (client_document_slots) — this previously only counted the former, so it
    // undercounted for any client with slot-uploaded documents (Site Audit, Service Tier,
    // etc.) and never matched what the admin actually sees as "documents uploaded."
    const [msgRes, docRes, slotRes] = await Promise.all([
      supabase.from("client_messages").select("id").or(msgFilter),
      supabase.from("client_documents").select("id").or(docFilter),
      pid
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? (supabase as any)
            .from("client_document_slots")
            .select("id, status")
            .eq("client_profile_id", pid)
        : Promise.resolve({ data: [] }),
    ]);
    setMsgCount((msgRes.data || []).length);
    const uploadedSlotCount = (slotRes.data || []).filter((s: { status: string }) =>
      ["uploaded", "awaiting_signature", "completed"].includes(s.status)
    ).length;
    setDocCount((docRes.data || []).length + uploadedSlotCount);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, resolvedProfile]);

  const openEdit = () => {
    if (!profile || isViewingAsAdmin) return;
    setEditFullName(profile.full_name || "");
    setEditBusinessName(profile.business_name || "");
    setEditPhone(profile.phone || "");
    setEditOpen(true);
  };

  const saveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase
      .from("client_profiles")
      .update({
        full_name: editFullName.trim(),
        business_name: editBusinessName.trim() || null,
        phone: editPhone.trim() || null,
      })
      .eq("id", profile.id);
    setSaving(false);
    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Profile updated" });
    setEditOpen(false);
    load();
  };

  return (
    <div>
      <h1 className="text-2xl font-display tracking-wider mb-2">
        Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}!
      </h1>
      <p className="text-muted-foreground mb-8">
        This is your client portal. Here you can communicate with our team, view documents, & manage your project.
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        <button onClick={openEdit} disabled={isViewingAsAdmin} className="text-left block disabled:cursor-default">
          <Card className={`border-border/30 h-full ${isViewingAsAdmin ? "" : "hover:border-primary/40 transition-colors cursor-pointer"}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Profile</CardTitle>
              <User className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-sm">{profile?.business_name || "No business name set"}</p>
              <p className="text-xs text-muted-foreground mt-1">{profile?.email || user?.email}</p>
            </CardContent>
          </Card>
        </button>

        <Link to="/portal/messages" className="block">
          <Card className="border-border/30 hover:border-primary/40 transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{msgCount}</div>
              <p className="text-xs text-muted-foreground mt-1">messages sent</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/portal/documents" className="block">
          <Card className="border-border/30 hover:border-primary/40 transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Documents</CardTitle>
              <FolderOpen className="h-4 w-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{docCount}</div>
              <p className="text-xs text-muted-foreground mt-1">files available</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Profile</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Full name</Label>
              <Input value={editFullName} onChange={(e) => setEditFullName(e.target.value)} />
            </div>
            <div>
              <Label>Business name</Label>
              <Input value={editBusinessName} onChange={(e) => setEditBusinessName(e.target.value)} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">
              Email is tied to your login and can't be changed here — contact us if it needs to be updated.
            </p>
            <Button onClick={saveProfile} disabled={saving || !editFullName.trim()} className="w-full">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PortalOverview;
