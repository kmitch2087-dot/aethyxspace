import { useEffect, useState } from "react";
import { ArrowRight, Gift, Loader2, Rocket, TrendingUp, UserPlus } from "lucide-react";
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

const steps = [
  {
    number: "01",
    title: "Apply once",
    desc: "Tell us who you are. Once you're approved, you get a personal referral code to share.",
  },
  {
    number: "02",
    title: "Refer a business",
    desc: "Know someone who needs a website or ads management? Send them to Aethyx with your code.",
  },
  {
    number: "03",
    title: "Get paid",
    desc: "You earn cash when they sign — and a bonus when their project goes live. No cap on referrals.",
  },
];

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

  const rewards = settings
    ? [
        {
          icon: UserPlus,
          amount: `$${Number(settings.first_reward_amount).toFixed(0)}`,
          label: "When they sign",
          desc: "Cash in your pocket the moment your referral becomes an Aethyx client.",
        },
        {
          icon: Rocket,
          amount: `+$${Number(settings.completion_bonus_amount).toFixed(0)}`,
          label: "When their project goes live",
          desc: "A launch bonus on top — you get paid twice for one introduction.",
        },
        {
          icon: TrendingUp,
          amount: `${(Number(settings.commission_rate) * 100).toFixed(0)}%`,
          label: `Commission after ${settings.tier_threshold} referrals`,
          desc: "Keep referring and level up to a recurring cut of every deal you send.",
        },
        {
          icon: Gift,
          amount: `$${Number(settings.new_client_discount).toFixed(0)} off`,
          label: "For the business you refer",
          desc: "Your referral gets a discount too — you're doing them a favor, not selling them.",
        },
      ]
    : [];

  return (
    <div className="min-h-screen bg-transparent text-foreground">
      <Seo
        title="Bounty Program | Aethyx"
        description="Refer clients to Aethyx and earn cash rewards. Apply to join our bounty program."
      />
      <Navbar />

      {/* Hero */}
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden pt-32 pb-20 px-6">
        <div aria-hidden className="pointer-events-none select-none absolute inset-0 flex items-center justify-center">
          <span className="font-display font-black tracking-tight text-outline opacity-[0.07] text-[24vw] leading-none whitespace-nowrap">
            BOUNTY
          </span>
        </div>

        <div className="relative z-10 text-center w-full max-w-5xl mx-auto">
          <p className="text-primary text-xs md:text-sm tracking-[0.4em] uppercase mb-8">Earn With Aethyx</p>
          <h1 className="font-display font-black tracking-tight leading-[1.02] text-5xl md:text-7xl lg:text-[6rem] mb-8">
            <span className="block text-foreground">Know a business that</span>
            <span className="block text-outline">needs to level up?</span>
          </h1>
          <p className="text-foreground/70 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
            Refer them to Aethyx and earn real cash — when they sign, and again when their
            project goes live. One introduction, paid twice.
          </p>
          <a
            href="#apply"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-primary-foreground font-semibold tracking-[0.2em] uppercase text-sm hover:bg-primary/90 transition-all hover:-translate-y-0.5"
          >
            Apply Now <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* Rewards */}
      {!loadingSettings && settings && (
        <section className="py-24 px-6 border-t border-border/20">
          <div className="max-w-6xl mx-auto">
            <p className="text-primary text-xs tracking-[0.4em] uppercase text-center mb-4">The Payout</p>
            <h2 className="font-display text-3xl md:text-5xl text-center mb-16 tracking-tight">What one referral is worth</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {rewards.map((r) => (
                <div
                  key={r.label}
                  className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-8 text-center group hover:border-primary/50 hover:bg-card/60 transition-all"
                >
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/20 transition-colors">
                    <r.icon className="h-6 w-6 text-primary" />
                  </div>
                  <p className="font-display font-black text-4xl text-primary mb-2">{r.amount}</p>
                  <p className="text-xs tracking-[0.2em] uppercase text-foreground/70 mb-4">{r.label}</p>
                  <p className="text-muted-foreground text-sm leading-relaxed">{r.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="py-24 px-6 border-t border-border/20">
        <div className="max-w-5xl mx-auto">
          <p className="text-primary text-xs tracking-[0.4em] uppercase text-center mb-4">How It Works</p>
          <h2 className="font-display text-3xl md:text-5xl text-center mb-16 tracking-tight">Three steps, zero selling</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {steps.map((s) => (
              <div key={s.number} className="text-center md:text-left">
                <p className="font-display font-black text-5xl text-outline mb-4">{s.number}</p>
                <h3 className="font-display text-2xl mb-3">{s.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Application */}
      <section id="apply" className="py-24 px-6 border-t border-border/20">
        <div className="max-w-2xl mx-auto">
          <p className="text-primary text-xs tracking-[0.4em] uppercase text-center mb-4">Join The Program</p>
          <h2 className="font-display text-3xl md:text-5xl text-center mb-6 tracking-tight">Apply in under a minute</h2>
          <p className="text-muted-foreground text-base text-center max-w-xl mx-auto mb-12 leading-relaxed">
            Once you're approved, you'll get a personal referral code by email — share it with
            anyone who needs a serious website or ads management.
          </p>

          {settings?.eligibility_notes && (
            <p className="text-xs text-muted-foreground leading-relaxed mb-10 text-center">{settings.eligibility_notes}</p>
          )}

          {submitted ? (
            <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm px-6 py-12 text-center">
              <p className="text-lg font-medium mb-2">Application received</p>
              <p className="text-sm text-muted-foreground">
                We'll review your application and follow up by email once it's approved.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-8 md:p-10 space-y-5">
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
              <Button type="submit" disabled={submitting} className="w-full rounded-full tracking-[0.2em] uppercase">
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Apply Now
              </Button>
            </form>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Bounty;
