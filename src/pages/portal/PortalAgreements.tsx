import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePortalClientProfile } from "@/hooks/usePortalClientProfile";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { FileSignature, Loader2 } from "lucide-react";
import AgreementDocument from "@/components/AgreementDocument";

const PortalAgreements = () => {
  const { user } = useAuth();
  const { profile: resolvedProfile, loading: profileLoading, isViewingAsAdmin } = usePortalClientProfile();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ id: string; full_name: string; email: string | null } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [record, setRecord] = useState<any | null>(null);

  const load = async () => {
    if (!user || profileLoading) return;
    setLoading(true);
    const profileData = resolvedProfile;
    setProfile(profileData);

    if (profileData) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: recordData } = await (supabase as any)
        .from("client_agreement_records")
        .select("*")
        .eq("client_profile_id", profileData.id)
        .maybeSingle();
      setRecord(recordData);

      if (!isViewingAsAdmin) {
        (supabase as any)
          .from("client_portal_seen_at")
          .upsert(
            { client_profile_id: profileData.id, item_type: "agreements", last_seen_at: new Date().toISOString() },
            { onConflict: "client_profile_id,item_type" },
          )
          .then(() => {});
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, resolvedProfile, profileLoading]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!record || !profile) {
    return (
      <div>
        <h1 className="text-2xl font-display tracking-wider mb-6">Agreements</h1>
        <Card className="border-border/30">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileSignature className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="font-display text-lg mb-2">No Agreement Yet</h3>
            <p className="text-muted-foreground text-sm max-w-md">
              Your service agreement will appear here once it's ready for your review and signature.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-display tracking-wider mb-6">Agreements</h1>
      <AgreementDocument
        record={record}
        clientProfileId={profile.id}
        clientName={profile.full_name}
        clientEmail={profile.email || ""}
        mode="client"
        readOnly={isViewingAsAdmin}
        onSave={async (updates) => {
          if (isViewingAsAdmin) return;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error } = await (supabase as any)
            .from("client_agreement_records")
            .update(updates)
            .eq("id", record.id);
          if (error) throw error;
          setRecord((prev: typeof record) => prev ? { ...prev, ...updates } : prev);
        }}
        onSubmit={() => load()}
      />
    </div>
  );
};

export default PortalAgreements;
