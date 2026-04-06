import { useState } from "react";
import { Phone, Mail, Calendar, ArrowRight, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const CALENDAR_URL =
  "https://calendar.proton.me/api/calendar/v1/url/CtK3M_QydYnTFm4aU0KJt59M2M-dPR7-q-O_3QTq8PyyPgKxGGaO-KWqFxlRpO_U5B4mi6ciJEh6aQEv_QpU7Q==/calendar.ics?CacheKey=fceIC3PAtEgsv-OL4bgVkA%3D%3D";

const Contact = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [projectDetails, setProjectDetails] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: "Email required", description: "Please enter your email.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-consultation-payment", {
        body: { email, name, businessName, projectDetails },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
      else throw new Error("No checkout URL returned");
    } catch (error: unknown) {
      console.error("Payment error:", error);
      toast({
        title: "Payment Error",
        description: error instanceof Error ? error.message : "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "rounded-xl bg-muted/50 border-border text-foreground placeholder:text-muted-foreground/40 focus:border-primary/40";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <div className="pt-28 pb-24 px-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="font-display text-4xl md:text-6xl text-center mb-4">Get in Touch</h1>
          <p className="text-center text-muted-foreground text-lg mb-20 max-w-2xl mx-auto">
            Ready to build something bold? Reach out directly or book a paid consultation to get started.
          </p>

          {/* Contact Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
            <a href="tel:+14015891023" className="glass-card p-8 text-center group hover:border-destructive/30 transition-all">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-5">
                <Phone className="h-5 w-5 text-destructive" />
              </div>
              <h3 className="text-sm font-medium uppercase tracking-widest mb-3 text-foreground/80">Client Emergency</h3>
              <p className="text-muted-foreground text-sm mb-4">Issues affecting your business operations?</p>
              <span className="text-destructive/80 text-sm font-medium group-hover:text-destructive transition-colors">401-589-1023</span>
            </a>

            <a href="mailto:Aethyxspace@protonmail.com" className="glass-card p-8 text-center group hover:border-primary/30 transition-all">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-sm font-medium uppercase tracking-widest mb-3 text-foreground/80">General Contact</h3>
              <p className="text-muted-foreground text-sm mb-4">Non-urgent inquiries or just want to say hey.</p>
              <span className="text-primary/80 text-sm font-medium group-hover:text-primary transition-colors">aethyxspace@protonmail.com</span>
            </a>

            <div className="glass-card p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-5">
                <Calendar className="h-5 w-5 text-accent" />
              </div>
              <h3 className="text-sm font-medium uppercase tracking-widest mb-3 text-foreground/80">Book a Consultation</h3>
              <p className="text-muted-foreground text-sm mb-4">$50 one-time fee, credited toward your project.</p>
              <a
                href={CALENDAR_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-accent text-sm hover:text-accent/80 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" /> View available times
              </a>
            </div>
          </div>

          {/* Consultation Form */}
          <div className="max-w-lg mx-auto glass-card p-8 md:p-10">
            <h2 className="font-display text-2xl mb-2">Book Your Consultation</h2>
            <p className="text-muted-foreground text-sm mb-8">
              Fill out the details below, then complete the $50 payment to secure your spot.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground/70 text-sm">Your Name</Label>
                <Input id="name" placeholder="Jane Smith" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground/70 text-sm">
                  Email Address <span className="text-destructive">*</span>
                </Label>
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="business" className="text-foreground/70 text-sm">Business Name</Label>
                <Input id="business" placeholder="Your Business" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className={inputClass} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="details" className="text-foreground/70 text-sm">Tell us about your project</Label>
                <Textarea id="details" placeholder="What are you looking to build or improve?" value={projectDetails} onChange={(e) => setProjectDetails(e.target.value)} rows={4} className={`${inputClass} resize-none`} />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-full py-6 bg-accent hover:bg-accent/85 text-accent-foreground transition-all hover:-translate-y-0.5 mt-2"
              >
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                ) : (
                  <>Pay $50 & Book Consultation <ArrowRight className="ml-2 h-4 w-4" /></>
                )}
              </Button>
            </form>

            <p className="text-center text-xs text-muted-foreground mt-4">
              Secure payment powered by Stripe. Your $50 is credited toward your final project total.
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Contact;
