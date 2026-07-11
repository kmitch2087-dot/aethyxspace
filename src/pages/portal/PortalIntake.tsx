import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePortalClientProfile } from "@/hooks/usePortalClientProfile";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

type Field = {
  id: string; field_key: string; label: string; help_text: string | null;
  field_type: string; options: string[]; required: boolean;
  section: "about" | "project" | "market" | "extra"; display_order: number;
};

const SECTION_META: Record<string, { eyebrow: string; title: string }> = {
  about: { eyebrow: "01", title: "About you" },
  project: { eyebrow: "02", title: "The project" },
  market: { eyebrow: "03", title: "The market" },
  extra: { eyebrow: "04", title: "Anything else" },
};

const PortalIntake = () => {
  const { user } = useAuth();
  const { profile: resolvedProfile, loading: profileLoading, isViewingAsAdmin } = usePortalClientProfile();
  const { toast } = useToast();
  const nav = useNavigate();
  const [fields, setFields] = useState<Field[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!user || profileLoading) return;
    (async () => {
      const { data: f } = await supabase.from("intake_form_fields").select("*").eq("active", true).order("section").order("display_order");
      const p = resolvedProfile;
      setFields((f || []) as any);
      setProfile(p);
      if (p) {
        setValues({
          full_name: p.full_name || "",
          email: p.email || user.email || "",
          phone: String(p.phone ?? ""),
          business_name: String(p.business_name ?? ""),
        });
      }
      setLoading(false);
    })();
  }, [user, resolvedProfile, profileLoading]);

  const grouped = useMemo(() => {
    const m: Record<string, Field[]> = { about: [], project: [], market: [], extra: [] };
    for (const f of fields) m[f.section]?.push(f);
    return m;
  }, [fields]);

  const setVal = (k: string, v: string) => setValues((s) => ({ ...s, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !user || isViewingAsAdmin) return;
    const missing = fields.filter((f) => f.required && !(values[f.field_key] || "").trim());
    if (missing.length) {
      toast({ title: "A few fields are missing", description: missing.map((m) => m.label).join(", "), variant: "destructive" });
      return;
    }
    const responses: Record<string, any> = {};
    for (const f of fields) responses[f.field_key] = { label: f.label, section: f.section, value: (values[f.field_key] || "").trim().slice(0, 5000) };

    setSubmitting(true);
    const intakeId = crypto.randomUUID();
    const fullName = (values.full_name || profile.full_name || "").slice(0, 200);
    const email = (values.email || profile.email || user.email || "").toLowerCase().slice(0, 320);

    const { error } = await supabase.from("client_intakes").insert({
      id: intakeId,
      full_name: fullName,
      email,
      phone: values.phone?.slice(0, 50) || null,
      business_name: values.business_name?.slice(0, 200) || null,
      responses,
      status: "new",
      client_profile_id: profile.id,
      linked_user_id: user.id,
    });
    if (error) {
      setSubmitting(false);
      toast({ title: "Submission failed", description: error.message, variant: "destructive" });
      return;
    }
    await supabase.from("client_profiles").update({
      intake_completed_at: new Date().toISOString(),
      intake_required: false,
    }).eq("id", profile.id);

    // Notify admin and fire dispatch event
    supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "intake-notification",
        recipientEmail: "kristinmitchell@aethyx.space",
        idempotencyKey: `intake-notify-${intakeId}`,
        templateData: {
          fullName, email,
          phone: values.phone || undefined,
          businessName: values.business_name || undefined,
          goals: Object.values(responses).filter((r: any) => r.value).map((r: any) => `${r.label}: ${r.value}`).join("\n"),
          submittedAt: new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }),
        },
      },
    }).catch(() => {});
    supabase.functions.invoke("dispatch-doc-event", {
      body: { event_name: "intake_completed", client_profile_id: profile.id },
    }).catch(() => {});

    toast({ title: "Thank you — intake received." });
    nav("/portal");
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl tracking-wider mb-2">Client Intake</h1>
      <p className="text-muted-foreground mb-8">Tell me about your brand so I can come prepared with real research before we meet.</p>
      <form onSubmit={submit} className="space-y-8">
        {(["about", "project", "market", "extra"] as const).map((section) => {
          const items = grouped[section] || [];
          if (!items.length) return null;
          const meta = SECTION_META[section];
          return (
            <section key={section} className="rounded-xl border border-border/30 p-6 bg-card/40">
              <p className="text-primary text-xs tracking-[0.4em] uppercase mb-1">{meta.eyebrow}</p>
              <h2 className="font-display text-xl mb-5">{meta.title}</h2>
              <div className="space-y-4">
                {items.map((f) => (
                  <div key={f.id} className="space-y-1.5">
                    <Label>{f.label}{f.required && <span className="text-destructive"> *</span>}</Label>
                    {f.field_type === "textarea" ? (
                      <Textarea rows={4} value={values[f.field_key] || ""} onChange={(e) => setVal(f.field_key, e.target.value)} />
                    ) : f.field_type === "select" ? (
                      <Select value={values[f.field_key] || ""} onValueChange={(v) => setVal(f.field_key, v)}>
                        <SelectTrigger><SelectValue placeholder="Select one" /></SelectTrigger>
                        <SelectContent>
                          {(f.options || []).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        type={["email", "tel", "url"].includes(f.field_type) ? f.field_type : "text"}
                        value={values[f.field_key] || ""}
                        onChange={(e) => setVal(f.field_key, e.target.value)}
                      />
                    )}
                    {f.help_text && <p className="text-xs text-muted-foreground">{f.help_text}</p>}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
        <div className="flex justify-end">
          <Button type="submit" disabled={isViewingAsAdmin || submitting} className="rounded-full px-8">
            {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting…</> : <>Submit intake <ArrowRight className="h-4 w-4 ml-2" /></>}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PortalIntake;
