import { useState, useRef } from "react";
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

  const videoRef = useRef<HTMLVideoElement>(null);

  const handleVideoLoaded = () => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.6;
    }
  };

  return (
    <div className="min-h-screen text-[#e8e6e1] relative overflow-hidden" style={{ background: "#060a12" }}>
      {/* Video as full-width background hero */}
      <div className="fixed inset-0 z-0">
        <video
          ref={videoRef}
          src="/aethyx-intro.mov"
          autoPlay
          muted
          playsInline
          onLoadedData={handleVideoLoaded}
          className="w-full h-full object-cover"
        />
        {/* Bottom fade so content below blends smoothly */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 30%, #060a12 85%)" }} />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center px-6 pt-[55vh] md:pt-[60vh] pb-16">

        {/* Tagline */}
        <p className="font-display text-3xl md:text-4xl lg:text-5xl font-bold tracking-[0.15em] uppercase text-[#4ECDC4] mb-8 text-center" style={{ textShadow: "0 0 30px rgba(78,205,196,0.3)" }}>
          Crafting Identity in the Unseen
        </p>

        {/* Rebrand announcement */}
        <div className="max-w-3xl text-center mb-20 md:mb-28">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight" style={{ textShadow: "0 2px 20px rgba(0,0,0,0.5)" }}>
            Something new is taking shape.
          </h1>
          <p className="text-2xl md:text-3xl lg:text-4xl font-bold leading-snug" style={{ textShadow: "0 2px 20px rgba(0,0,0,0.5)" }}>
            Vibe Shift Studio is becoming{" "}
            <span className="text-[#e8e6e1]">Aethyx</span>. Same
            vision. Bolder execution. Stay tuned.
          </p>
        </div>

        {/* Contact cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full mb-16 mt-8">
          {/* Emergency */}
          <a
            href="tel:+14015891023"
            className="group rounded-2xl border border-[#e8e6e1]/[0.1] bg-[#0c1528]/80 backdrop-blur-md p-8 text-center transition-all duration-300 hover:border-[#ff6b6b]/30 hover:bg-[#121d35]/90" style={{ boxShadow: "0 0 40px 5px rgba(12,21,40,0.6), inset 0 1px 0 rgba(255,255,255,0.05)" }}
          >
            <div className="w-12 h-12 rounded-full bg-[#ff6b6b]/10 flex items-center justify-center mx-auto mb-5">
              <Phone className="h-5 w-5 text-[#ff6b6b]" />
            </div>
            <h3 className="text-sm font-medium uppercase tracking-widest mb-3 text-[#e8e6e1]/80">
              Client Emergency
            </h3>
            <p className="text-[#e8e6e1]/50 text-sm font-light mb-4 leading-relaxed">
              Issues with your website inhibiting payment collection or business
              operations?
            </p>
            <span className="text-[#ff6b6b]/80 text-sm font-medium group-hover:text-[#ff6b6b] transition-colors">
              Call anytime — 401-589-1023
            </span>
          </a>

          {/* General contact */}
          <a
            href="mailto:Aethyxspace@protonmail.com"
            className="group rounded-2xl border border-[#e8e6e1]/[0.1] bg-[#0c1528]/80 backdrop-blur-md p-8 text-center transition-all duration-300 hover:border-[#4ECDC4]/30 hover:bg-[#121d35]/90" style={{ boxShadow: "0 0 40px 5px rgba(12,21,40,0.6), inset 0 1px 0 rgba(255,255,255,0.05)" }}
          >
            <div className="w-12 h-12 rounded-full bg-[#4ECDC4]/10 flex items-center justify-center mx-auto mb-5">
              <Mail className="h-5 w-5 text-[#4ECDC4]" />
            </div>
            <h3 className="text-sm font-medium uppercase tracking-widest mb-3 text-[#e8e6e1]/80">
              General Contact
            </h3>
            <p className="text-[#e8e6e1]/50 text-sm font-light mb-4 leading-relaxed">
              Non-urgent inquiries, questions, or just want to say hey.
            </p>
            <span className="text-[#4ECDC4]/80 text-sm font-medium group-hover:text-[#4ECDC4] transition-colors">
              Aethyxspace@protonmail.com
            </span>
          </a>

          {/* Consultation */}
          <button
            onClick={() => setShowForm(!showForm)}
            className="group rounded-2xl border border-[#e8e6e1]/[0.1] bg-[#0c1528]/80 backdrop-blur-md p-8 text-center transition-all duration-300 hover:border-[#7B68EE]/30 hover:bg-[#121d35]/90 text-left" style={{ boxShadow: "0 0 40px 5px rgba(12,21,40,0.6), inset 0 1px 0 rgba(255,255,255,0.05)" }}
          >
            <div className="w-12 h-12 rounded-full bg-[#7B68EE]/10 flex items-center justify-center mx-auto mb-5">
              <Calendar className="h-5 w-5 text-[#7B68EE]" />
            </div>
            <h3 className="text-sm font-medium uppercase tracking-widest mb-3 text-[#e8e6e1]/80 text-center">
              Book a Consultation
            </h3>
            <p className="text-[#e8e6e1]/50 text-sm font-light mb-4 leading-relaxed text-center">
              $50 one-time fee, credited toward your project total.
            </p>
            <span className="text-[#7B68EE]/80 text-sm font-medium group-hover:text-[#7B68EE] transition-colors block text-center">
              Get started →
            </span>
          </button>
        </div>

        {/* Consultation form */}
        {showForm && (
          <div className="max-w-lg w-full rounded-2xl border border-[#7B68EE]/20 bg-[#e8e6e1]/[0.03] backdrop-blur-sm p-8 md:p-10 mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-medium mb-2">Book Your Consultation</h2>
            <p className="text-[#e8e6e1]/50 text-sm font-light mb-6">
              Fill out the details below, then complete the $50 payment to
              secure your spot.
            </p>

            <a
              href={CALENDAR_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[#7B68EE] text-sm mb-6 hover:text-[#7B68EE]/80 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View available times (subscribe to calendar)
            </a>

            <form onSubmit={handleConsultationSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="consult-name" className="text-[#e8e6e1]/70 text-sm">
                  Your Name
                </Label>
                <Input
                  id="consult-name"
                  type="text"
                  placeholder="Jane Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-xl bg-[#e8e6e1]/[0.05] border-[#e8e6e1]/10 text-[#e8e6e1] placeholder:text-[#e8e6e1]/30 focus:border-[#7B68EE]/40"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="consult-email" className="text-[#e8e6e1]/70 text-sm">
                  Email Address <span className="text-[#ff6b6b]">*</span>
                </Label>
                <Input
                  id="consult-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="rounded-xl bg-[#e8e6e1]/[0.05] border-[#e8e6e1]/10 text-[#e8e6e1] placeholder:text-[#e8e6e1]/30 focus:border-[#7B68EE]/40"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="consult-business" className="text-[#e8e6e1]/70 text-sm">
                  Business Name
                </Label>
                <Input
                  id="consult-business"
                  type="text"
                  placeholder="Your Business"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="rounded-xl bg-[#e8e6e1]/[0.05] border-[#e8e6e1]/10 text-[#e8e6e1] placeholder:text-[#e8e6e1]/30 focus:border-[#7B68EE]/40"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="consult-details" className="text-[#e8e6e1]/70 text-sm">
                  Tell us about your project
                </Label>
                <Textarea
                  id="consult-details"
                  placeholder="What are you looking to build or improve?"
                  value={projectDetails}
                  onChange={(e) => setProjectDetails(e.target.value)}
                  rows={4}
                  className="rounded-xl bg-[#e8e6e1]/[0.05] border-[#e8e6e1]/10 text-[#e8e6e1] placeholder:text-[#e8e6e1]/30 focus:border-[#7B68EE]/40 resize-none"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-full py-6 bg-[#7B68EE] hover:bg-[#7B68EE]/85 text-white transition-all duration-300 hover:-translate-y-0.5 mt-2"
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

            <p className="text-center text-xs text-[#e8e6e1]/30 mt-4 font-light">
              Secure payment powered by Stripe. Your $50 fee is credited toward
              your final project total.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#e8e6e1]/[0.06] py-8 px-6 text-center">
        <p className="text-xs text-[#e8e6e1]/30 font-light">
          © {new Date().getFullYear()} Aethyx. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default Rebrand;
