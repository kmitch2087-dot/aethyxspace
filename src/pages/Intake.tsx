import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type IntakeField = {
  id: string;
  field_key: string;
  label: string;
  help_text: string | null;
  field_type: "text" | "textarea" | "email" | "tel" | "url" | "select" | "multiselect";
  options: string[];
  required: boolean;
  section: "about" | "project" | "market" | "extra";
  display_order: number;
};

const SECTION_META: Record<IntakeField["section"], { title: string; eyebrow: string }> = {
  about: { eyebrow: "01", title: "About you" },
  project: { eyebrow: "02", title: "The project" },
  market: { eyebrow: "03", title: "The market" },
  extra: { eyebrow: "04", title: "Anything else" },
};

const inputClass =
  "rounded-xl bg-muted/50 border-border text-foreground placeholder:text-muted-foreground/40 focus:border-primary/40";

const Intake = () => {
  const [fields, setFields] = useState<IntakeField[]>([]);
  const [loadingFields, setLoadingFields] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get("ref");
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("intake_form_fields")
        .select("*")
        .eq("active", true)
        .order("section", { ascending: true })
        .order("display_order", { ascending: true });

      if (error) {
        console.error("Intake form load error:", error);
        toast({ title: "Could not load form", description: "Please refresh and try again.", variant: "destructive" });
      } else {
        setFields((data || []) as unknown as IntakeField[]);
      }
      setLoadingFields(false);
    })();
  }, [toast]);

  const grouped = useMemo(() => {
    const map: Record<string, IntakeField[]> = { about: [], project: [], market: [], extra: [] };
    for (const f of fields) map[f.section]?.push(f);
    return map;
  }, [fields]);

  const setVal = (key: string, v: string) => setValues((s) => ({ ...s, [key]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const missing = fields.filter((f) => f.required && !(values[f.field_key] || "").trim());
    if (missing.length) {
      toast({
        title: "A few fields are missing",
        description: `Please complete: ${missing.map((m) => m.label).join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    const responses: Record<string, { label: string; section: string; value: string }> = {};
    for (const f of fields) {
      responses[f.field_key] = {
        label: f.label,
        section: f.section,
        value: (values[f.field_key] || "").trim().slice(0, 5000),
      };
    }

    setSubmitting(true);
    const intakeId = crypto.randomUUID();
    const fullName = (values.full_name || "").trim().slice(0, 200);
    const emailVal = (values.email || "").trim().toLowerCase().slice(0, 320);
    const phoneVal = values.phone ? values.phone.trim().slice(0, 50) : null;
    const businessVal = values.business_name ? values.business_name.trim().slice(0, 200) : null;

    const { error } = await supabase.from("client_intakes").insert({
      id: intakeId,
      full_name: fullName,
      email: emailVal,
      phone: phoneVal,
      business_name: businessVal,
      responses,
      status: "new",
      referral_code: referralCode || null,
    });
    setSubmitting(false);

    if (error) {
      console.error("Intake submit error:", error);
      toast({ title: "Submission failed", description: "Something went wrong. Please try again.", variant: "destructive" });
      return;
    }

    if (referralCode) {
      supabase
        .rpc("resolve_and_record_referral", {
          p_code: referralCode,
          p_intake_id: intakeId,
          p_referred_name: fullName,
          p_referred_email: emailVal,
        })
        .then(({ data: waived, error: rpcError }) => {
          if (rpcError) {
            console.warn("Referral resolution failed:", rpcError);
            return;
          }
          // Mirror the admin's manual "waive fee" action: send the same fee-waived
          // email whenever a valid referral/bounty code actually waives the fee here,
          // so the client is notified consistently regardless of which path waived it.
          if (waived) {
            supabase.functions
              .invoke("send-transactional-email", {
                body: {
                  templateName: "fee-waived",
                  recipientEmail: emailVal,
                  idempotencyKey: `fee-waived-${intakeId}`,
                  templateData: {
                    firstName: fullName.split(" ")[0] || "",
                    originalAmount: "50.00",
                    discountLabel: "Referral code",
                  },
                },
              })
              .catch((err) => console.warn("Fee-waived email failed:", err));
          }
        });
    }

    // Notify admin (fire-and-forget — don't block the user on email failure)
    const goalsText = Object.values(responses)
      .filter((r) => r.value)
      .map((r) => `${r.label}: ${r.value}`)
      .join("\n");
    supabase.functions
      .invoke("send-transactional-email", {
        body: {
          templateName: "intake-notification",
          recipientEmail: "kristinmitchell@aethyx.space",
          idempotencyKey: `intake-notify-${intakeId}`,
          templateData: {
            fullName,
            email: emailVal,
            phone: phoneVal || undefined,
            businessName: businessVal || undefined,
            goals: goalsText,
            submittedAt: new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }),
          },
        },
      })
      .catch((err) => console.warn("Intake notification email failed:", err));

    // Send confirmation to the client
    supabase.functions
      .invoke("send-transactional-email", {
        body: {
          templateName: "intake-confirmation",
          recipientEmail: emailVal,
          idempotencyKey: `intake-confirm-${intakeId}`,
          templateData: { name: fullName.split(" ")[0] || fullName },
        },
      })
      .catch((err) => console.warn("Intake confirmation email failed:", err));

    navigate("/intake-success");
  };

  const renderField = (f: IntakeField) => {
    const common = {
      id: f.field_key,
      required: f.required,
      value: values[f.field_key] || "",
    };

    if (f.field_type === "textarea") {
      return (
        <Textarea
          {...common}
          rows={4}
          className={`${inputClass} resize-none`}
          onChange={(e) => setVal(f.field_key, e.target.value)}
        />
      );
    }

    if (f.field_type === "select") {
      return (
        <Select value={values[f.field_key] || ""} onValueChange={(v) => setVal(f.field_key, v)}>
          <SelectTrigger className={inputClass}>
            <SelectValue placeholder="Select one" />
          </SelectTrigger>
          <SelectContent>
            {(f.options || []).map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    return (
      <Input
        {...common}
        type={f.field_type === "email" ? "email" : f.field_type === "tel" ? "tel" : f.field_type === "url" ? "url" : "text"}
        className={inputClass}
        onChange={(e) => setVal(f.field_key, e.target.value)}
      />
    );
  };

  return (
    <div className="min-h-screen bg-transparent text-foreground">
      <Seo
        title="Let's Connect — Aethyx"
        description="Share a few details about your brand. Aethyx personally reviews every submission and follows up to discuss next steps."
        path="/intake"
      />
      <Navbar />

      <div className="pt-28 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <p className="text-primary text-xs tracking-[0.4em] uppercase text-center mb-4">
            Begin with intent
          </p>
          <h1 className="font-display text-4xl md:text-6xl text-center mb-6 tracking-tight">
            Let's Connect
          </h1>
          <p className="text-center text-muted-foreground text-base md:text-lg max-w-2xl mx-auto mb-14 leading-relaxed">
            Tell me a bit about your brand. I'll personally review your submission, do real research on
            your market and competitors, then reach out within 2 business days to discuss next
            steps — so when we meet, I come with real data.
          </p>

          {loadingFields ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-12">
              {(Object.keys(SECTION_META) as IntakeField["section"][]).map((section) => {
                const items = grouped[section] || [];
                if (!items.length) return null;
                const meta = SECTION_META[section];
                return (
                  <section key={section} className="glass-card p-6 md:p-10">
                    <div className="mb-8">
                      <p className="text-primary text-xs tracking-[0.4em] uppercase mb-2">
                        {meta.eyebrow}
                      </p>
                      <h2 className="font-display text-2xl md:text-3xl tracking-tight">
                        {meta.title}
                      </h2>
                    </div>

                    <div className="space-y-5">
                      {items.map((f) => (
                        <div key={f.id} className="space-y-2">
                          <Label htmlFor={f.field_key} className="text-foreground/80 text-sm">
                            {f.label}
                            {f.required && <span className="text-destructive"> *</span>}
                          </Label>
                          {renderField(f)}
                          {f.help_text && (
                            <p className="text-xs text-muted-foreground">{f.help_text}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}

              <div className="text-center pt-2">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="rounded-full px-10 py-6 bg-primary hover:bg-primary/90 text-primary-foreground tracking-[0.2em] uppercase text-sm transition-all hover:-translate-y-0.5"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…
                    </>
                  ) : (
                    <>
                      Send <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground mt-4">
                  Submitting this form is free. If we're a good fit, your next step is the $50 strategy consultation.
                </p>
              </div>
            </form>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Intake;
