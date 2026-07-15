import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePortalClientProfile } from "@/hooks/usePortalClientProfile";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSignature, Loader2, CreditCard } from "lucide-react";
import AgreementDocument from "@/components/AgreementDocument";

const PortalAgreements = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile: resolvedProfile, loading: profileLoading, isViewingAsAdmin } = usePortalClientProfile();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ id: string; full_name: string; email: string | null } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [record, setRecord] = useState<any | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const [invoice, setInvoice] = useState<{ id: string; status: string; amount_due: number } | null>(null);
  const [invoicing, setInvoicing] = useState(false);

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

      if (recordData?.down_payment_invoice_id) {
        const { data: inv } = await supabase
          .from("client_invoices")
          .select("id, status, amount_due")
          .eq("id", recordData.down_payment_invoice_id)
          .maybeSingle();
        setInvoice(inv ?? null);
      } else {
        setInvoice(null);
      }

      // Client's own logo for the agreement header — client_assets already has a
      // correctly-scoped client-own SELECT policy (ca_client_own), so this reads directly.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: logoAsset } = await (supabase as any)
        .from("client_assets")
        .select("file_name")
        .eq("client_profile_id", profileData.id)
        .eq("category", "logo")
        .eq("type", "file")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (logoAsset?.file_name) {
        const { data: signed } = await supabase.storage
          .from("client-assets")
          .createSignedUrl(logoAsset.file_name, 60 * 60 * 24 * 7);
        setLogoUrl(signed?.signedUrl);
      } else {
        setLogoUrl(undefined);
      }

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

  // Create (or fetch, if already created) the down-payment invoice for a signed
  // agreement, then send the client to the payment page.
  const ensureDownPaymentInvoice = async (recordId: string) => {
    if (isViewingAsAdmin) return;
    setInvoicing(true);
    const { data, error } = await supabase.functions.invoke("agreement-signed-actions", {
      body: { recordId },
    });
    setInvoicing(false);
    if (error || !data?.ok) {
      toast({
        title: "Agreement signed",
        description: "We couldn't set up your first payment automatically — your invoice will follow by email.",
      });
      load();
      return;
    }
    if (data.invoiceId) {
      toast({ title: "Agreement signed", description: "Taking you to your first payment…" });
      navigate(`/portal/pay/${data.invoiceId}`);
    } else {
      load();
    }
  };

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

  const signed = record.is_locked && record.client_signed_at;
  const needsFirstPayment =
    signed &&
    Number(record.down_payment_amount) > 0 &&
    (!record.down_payment_invoice_id || (invoice && invoice.status !== "paid"));

  return (
    <div>
      <h1 className="text-2xl font-display tracking-wider mb-6">Agreements</h1>
      {needsFirstPayment && (
        <Card className="border-primary/40 bg-primary/5 mb-6">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
            <div>
              <p className="font-medium">First payment due</p>
              <p className="text-sm text-muted-foreground">
                ${Number(record.down_payment_amount).toFixed(2)} is due upon signing to kick off your project.
              </p>
            </div>
            <Button
              disabled={invoicing || isViewingAsAdmin}
              onClick={() =>
                record.down_payment_invoice_id
                  ? navigate(`/portal/pay/${record.down_payment_invoice_id}`)
                  : ensureDownPaymentInvoice(record.id)
              }
            >
              {invoicing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
              Pay now
            </Button>
          </CardContent>
        </Card>
      )}
      <AgreementDocument
        record={record}
        clientProfileId={profile.id}
        clientName={profile.full_name}
        clientEmail={profile.email || ""}
        logoUrl={logoUrl}
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
        onSubmit={() => ensureDownPaymentInvoice(record.id)}
      />
    </div>
  );
};

export default PortalAgreements;
