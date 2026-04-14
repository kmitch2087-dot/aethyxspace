import { useState } from "react";
import { Phone, Mail, Calendar, ArrowRight, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";


const CALENDAR_URL =
  "https://calendar.proton.me/api/calendar/v1/url/CtK3M_QydYnTFm4aU0KJt59M2M-dPR7-q-O_3QTq8PyyPgKxGGaO-KWqFxlRpO_U5B4mi6ciJEh6aQEv_QpU7Q==/calendar.ics?CacheKey=fceIC3PAtEgsv-OL4bgVkA%3D%3D";

const Rebrand = () => {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [projectDetails, setProjectDetails] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleConsultationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address to continue.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        "create-consultation-payment",
        {
          body: {
            email,
            name,
            businessName,
            projectDetails,
          },
        }
      );

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error: unknown) {
      console.error("Payment error:", error);
      toast({
        title: "Payment Error",
        description:
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="min-h-screen text-foreground relative overflow-hidden">
      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center px-6 pt-[55vh] md:pt-[60vh] pb-16">
      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center px-6 pt-[55vh] md:pt-[60vh] pb-16">

        {/* Tagline */}
        <p className="font-display text-3xl md:text-4xl lg:text-5xl font-bold tracking-[0.15em] uppercase text-primary mb-8 text-center glow-teal">
          Crafting Identity in the Unseen
        </p>

        {/* Rebrand announcement */}
        <div className="max-w-3xl text-center mb-20 md:mb-28">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
            Something new is taking shape.
          </h1>
          <p className="text-2xl md:text-3xl lg:text-4xl font-bold leading-snug">
            Vibe Shift Studio is becoming{" "}
            <span className="text-foreground">Aethyx</span>. Same
            vision. Bolder execution. Stay tuned.
          </p>
        </div>

        {/* Contact cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full mb-16 mt-8">
          {/* Emergency */}
          <a
            href="tel:+14015891023"
            className="glass-card group p-8 text-center transition-all duration-300 hover:border-destructive/30"
          >
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-5">
              <Phone className="h-5 w-5 text-destructive" />
            </div>
            <h3 className="text-sm font-medium uppercase tracking-widest mb-3 text-foreground/80">
              Client Emergency
            </h3>
            <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
              Issues with your website inhibiting payment collection or business
              operations?
            </p>
            <span className="text-destructive/80 text-sm font-medium group-hover:text-destructive transition-colors">
              Call anytime — 401-589-1023
            </span>
          </a>

          {/* General contact */}
          <a
            href="mailto:Aethyxspace@protonmail.com"
            className="glass-card group p-8 text-center transition-all duration-300 hover:border-primary/30"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-sm font-medium uppercase tracking-widest mb-3 text-foreground/80">
              General Contact
            </h3>
            <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
              Non-urgent inquiries, questions, or just want to say hey.
            </p>
            <span className="text-primary/80 text-sm font-medium group-hover:text-primary transition-colors">
              Aethyxspace@protonmail.com
            </span>
          </a>

          {/* Consultation */}
          <button
            onClick={() => setShowForm(!showForm)}
            className="glass-card group p-8 text-center transition-all duration-300 hover:border-accent/30 text-left"
          >
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-5">
              <Calendar className="h-5 w-5 text-accent" />
            </div>
            <h3 className="text-sm font-medium uppercase tracking-widest mb-3 text-foreground/80 text-center">
              Book a Consultation
            </h3>
            <p className="text-muted-foreground text-sm mb-4 leading-relaxed text-center">
              $50 one-time fee, credited toward your project total.
            </p>
            <span className="text-accent text-sm font-medium group-hover:text-accent/80 transition-colors block text-center">
              Get started →
            </span>
          </button>
        </div>

        {/* Consultation form */}
        {showForm && (
          <div className="max-w-lg w-full glass-card p-8 md:p-10 mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-display font-bold mb-2">Book Your Consultation</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Fill out the details below, then complete the $50 payment to
              secure your spot.
            </p>

            <a
              href={CALENDAR_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary text-sm mb-6 hover:text-primary/80 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View available times (subscribe to calendar)
            </a>

            <form onSubmit={handleConsultationSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="consult-name" className="text-foreground/70 text-sm">
                  Your Name
                </Label>
                <Input
                  id="consult-name"
                  type="text"
                  placeholder="Jane Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-xl bg-muted/50 border-border text-foreground placeholder:text-muted-foreground/40 focus:border-primary/40"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="consult-email" className="text-foreground/70 text-sm">
                  Email Address <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="consult-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="rounded-xl bg-muted/50 border-border text-foreground placeholder:text-muted-foreground/40 focus:border-primary/40"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="consult-business" className="text-foreground/70 text-sm">
                  Business Name
                </Label>
                <Input
                  id="consult-business"
                  type="text"
                  placeholder="Your Business"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="rounded-xl bg-muted/50 border-border text-foreground placeholder:text-muted-foreground/40 focus:border-primary/40"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="consult-details" className="text-foreground/70 text-sm">
                  Tell us about your project
                </Label>
                <Textarea
                  id="consult-details"
                  placeholder="What are you looking to build or improve?"
                  value={projectDetails}
                  onChange={(e) => setProjectDetails(e.target.value)}
                  rows={4}
                  className="rounded-xl bg-muted/50 border-border text-foreground placeholder:text-muted-foreground/40 focus:border-primary/40 resize-none"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-full py-6 bg-primary hover:bg-primary/85 text-primary-foreground transition-all duration-300 hover:-translate-y-0.5 mt-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Pay $50 & Book Consultation
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <p className="text-center text-xs text-muted-foreground/50 mt-4">
              Secure payment powered by Stripe. Your $50 fee is credited toward
              your final project total.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/20 py-8 px-6 text-center">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Aethyx. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default Rebrand;
