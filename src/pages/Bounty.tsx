import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface ProgramSettings {
  first_reward_amount: number;
  completion_bonus_amount: number;
  tier_threshold: number;
  commission_rate: number;
  new_client_discount: number;
  eligibility_notes: string | null;
  enabled: boolean;
}

const inputClass =
  "rounded-xl bg-muted/50 border-border text-foreground placeholder:text-muted-foreground/40 focus:border-primary/40";

const Bounty = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<ProgramSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [values, setValues] = useState({
    full_name: "",
    email: "",
    phone: "",
    relationship_note: "",
  });
  const [taxAck, setTaxAck] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("referral_program_settings").select("*").limit(1).maybeSingle();
      setSettings(data as ProgramSettings | null);
      setLoadingSettings(false);
    })();
  }, []);

  const setVal = (key: keyof typeof values, v: string) => setValues((s) => ({ ...s, [key]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.full_name.trim() || !values.email.trim() || !taxAck) {
      toast({
        title: "A few fields are missing",
        description: "Please fill in your name, email, and acknowledge the tax reporting notice.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("bounty_applicants").insert({
      full_name: values.full_name.trim().slice(0, 200),
      email: values.email.trim().toLowerCase().slice(0, 320),
      phone: values.phone.trim() ? values.phone.trim().slice(0, 50) : null,
      relationship_note: values.relationship_note.trim() ? values.relationship_note.trim().slice(0, 2000) : null,
      tax_ack: taxAck,
      status: "pending",
    });
    setSubmitting(false);

    if (error) {
      console.error("Bounty application error:", error);
      toast({ title: "Submission failed", description: "Something went wrong. Please try again.", variant: "destructive" });
      return;
    }

    setSubmitted(true);
  };

  return (
    <>
      <Seo
        title="Bounty Program | Aethyx"
        description="Refer clients to Aethyx and earn cash rewards. Apply to join our bounty program."
      />
      <Navbar />
      <main className="min-h-screen pt-32 pb-24 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-display tracking-wider mb-3">Bounty Program</h1>
          <p className="text-muted-foreground text-base mb-8">
            Know a business that needs a website or ads management? Refer them to Aethyx and earn
            cash rewards when they sign on and go live.
          </p>

          {!loadingSettings && settings && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-10">
              <div className="rounded-lg border border-border/30 bg-muted/20 p-4">
                <p className="text-xs text-muted-foreground mb-1">When they sign</p>
                <p className="text-xl font-display font-bold text-primary">
                  ${Number(settings.first_reward_amount).toFixed(0)}
                </p>
              </div>
              <div className="rounded-lg border border-border/30 bg-muted/20 p-4">
                <p className="text-xs text-muted-foreground mb-1">When their project goes live</p>
                <p className="text-xl font-display font-bold text-primary">
                  +${Number(settings.completion_bonus_amount).toFixed(0)}
                </p>
              </div>
              <div className="rounded-lg border border-border/30 bg-muted/20 p-4">
                <p className="text-xs text-muted-foreground mb-1">After {settings.tier_threshold} referrals</p>
                <p className="text-xl font-display font-bold text-primary">
                  {(Number(settings.commission_rate) * 100).toFixed(0)}%
                </p>
              </div>
              <div className="rounded-lg border border-border/30 bg-muted/20 p-4">
                <p className="text-xs text-muted-foreground mb-1">They also get</p>
                <p className="text-xl font-display font-bold text-primary">
                  ${Number(settings.new_client_discount).toFixed(0)} off
                </p>
              </div>
            </div>
          )}

          {settings?.eligibility_notes && (
            <p className="text-xs text-muted-foreground leading-relaxed mb-10">{settings.eligibility_notes}</p>
          )}

          {submitted ? (
            <div className="rounded-xl border border-border/30 bg-muted/20 px-6 py-10 text-center">
              <p className="text-lg font-medium mb-2">Application received</p>
              <p className="text-sm text-muted-foreground">
                We'll review your application and follow up by email once it's approved.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="full_name">Full name</Label>
                <Input
                  id="full_name"
                  value={values.full_name}
                  onChange={(e) => setVal("full_name", e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={values.email}
                  onChange={(e) => setVal("email", e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone <span className="text-muted-foreground/50 text-xs">(optional)</span></Label>
                <Input
                  id="phone"
                  type="tel"
                  value={values.phone}
                  onChange={(e) => setVal("phone", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <Label htmlFor="relationship_note">How do you know Aethyx?</Label>
                <Textarea
                  id="relationship_note"
                  rows={3}
                  value={values.relationship_note}
                  onChange={(e) => setVal("relationship_note", e.target.value)}
                  className={inputClass}
                  placeholder="Tell us a bit about your relationship to Kristin/Aethyx…"
                />
              </div>
              <div className="flex items-start gap-2">
                <Checkbox id="tax_ack" checked={taxAck} onCheckedChange={(v) => setTaxAck(v === true)} />
                <Label htmlFor="tax_ack" className="text-xs text-muted-foreground font-normal leading-relaxed">
                  I understand that bounty rewards may be reportable income and that Aethyx may
                  request a completed W9 before any payout.
                </Label>
              </div>
              <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Apply Now
              </Button>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Bounty;
