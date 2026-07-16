import { useState } from "react";
import { ArrowRight, Handshake } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const inputClass =
  "rounded-xl bg-muted/50 border-border text-foreground placeholder:text-muted-foreground/40 focus:border-primary/40";

const emptyForm = { company_name: "", contact_name: "", email: "", website_url: "", message: "" };

// Shareable standalone version of /advertise's barter pitch — one page, one
// ask. Submissions land in the same advertiser_inquiries table, prefixed
// [Barter proposal] so they're identifiable in admin Inquiries.
const Barter = () => {
  const { toast } = useToast();
  const [values, setValues] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const setVal = (key: keyof typeof emptyForm, v: string) => setValues((s) => ({ ...s, [key]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.company_name.trim() || !values.contact_name.trim() || !values.email.trim()) {
      toast({
        title: "A few fields are missing",
        description: "Please fill in your company, name, and email.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("advertiser_inquiries").insert({
      company_name: values.company_name.trim().slice(0, 200),
      contact_name: values.contact_name.trim().slice(0, 200),
      email: values.email.trim().toLowerCase().slice(0, 320),
      website_url: values.website_url.trim() ? values.website_url.trim().slice(0, 500) : null,
      message: `[Barter proposal] ${values.message.trim() || "(no details provided)"}`.slice(0, 3000),
    });
    setSubmitting(false);
    if (error) {
      console.error("Barter inquiry error:", error);
      toast({ title: "Submission failed", description: "Something went wrong. Please try again.", variant: "destructive" });
      return;
    }
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-transparent text-foreground">
      <Seo
        title="Barter for Ad Space — Trade With Aethyx"
        description="Trade ad space, products, or services for placement on aethyx.space. Open to related, non-conflicting brands — pitch your trade."
        path="/barter"
      />
      <Navbar />

      <section className="pt-40 pb-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Handshake className="h-6 w-6 text-primary" />
          </div>
          <p className="text-primary text-xs tracking-[0.4em] uppercase mb-4">Trade With Us</p>
          <h1 className="font-display text-4xl md:text-6xl mb-6 tracking-tight">
            Barter for ad space
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto mb-4 leading-relaxed">
            Cash isn't the only way onto aethyx.space. If you're in a related field with no direct
            conflicts — and our audiences would genuinely benefit from each other — I'm open to
            trading placements: your ad space for mine, or space in exchange for products and
            services. Pitch me.
          </p>
          <p className="text-muted-foreground/70 text-sm mb-2">
            Curious what you'd be trading for? See the live traffic numbers on the{" "}
            <Link to="/advertise" className="text-primary underline hover:text-primary/80">
              advertising page
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="pb-28 px-6">
        <div className="max-w-2xl mx-auto">
          {submitted ? (
            <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm px-6 py-12 text-center">
              <p className="text-lg font-medium mb-2">Trade proposal received</p>
              <p className="text-sm text-muted-foreground">
                Thanks — every proposal gets a real look. I'll follow up by email if it's a fit.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-8 md:p-10 space-y-5">
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <Label htmlFor="company_name">Company / brand</Label>
                  <Input id="company_name" value={values.company_name} onChange={(e) => setVal("company_name", e.target.value)} className={inputClass} required />
                </div>
                <div>
                  <Label htmlFor="contact_name">Your name</Label>
                  <Input id="contact_name" value={values.contact_name} onChange={(e) => setVal("contact_name", e.target.value)} className={inputClass} required />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={values.email} onChange={(e) => setVal("email", e.target.value)} className={inputClass} required />
                </div>
                <div>
                  <Label htmlFor="website_url">Website</Label>
                  <Input id="website_url" placeholder="https://" value={values.website_url} onChange={(e) => setVal("website_url", e.target.value)} className={inputClass} />
                </div>
              </div>
              <div>
                <Label htmlFor="message">Your trade pitch</Label>
                <Textarea
                  id="message"
                  rows={5}
                  placeholder="Tell me about your brand, your audience, and what you'd offer in exchange — ad space on your site, products, services…"
                  value={values.message}
                  onChange={(e) => setVal("message", e.target.value)}
                  className={inputClass}
                />
              </div>
              <Button type="submit" disabled={submitting} className="w-full rounded-full tracking-widest uppercase text-sm h-12">
                {submitting ? "Sending…" : "Submit trade proposal"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Barter;
