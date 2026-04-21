import { useState } from "react";
import { ArrowRight, Loader2, Mail, Phone, MapPin, Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import { breadcrumb } from "@/lib/seoSchemas";

const Contact = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [businessName, setBusinessName] = useState("");
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
        body: { email, name, businessName, projectDetails: message },
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
    <div className="min-h-screen bg-transparent text-foreground">
      <Seo
        title="Contact Aethyx — Book a $50 Strategy Consultation"
        description="Start your project with a paid strategy consultation. Aethyx works with ambitious businesses across the USA on premium web design and digital platforms."
        path="/contact"
        jsonLd={breadcrumb([
          { name: "Home", path: "/" },
          { name: "Contact", path: "/contact" },
        ])}
      />
      <Navbar />

      <div className="pt-28 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-display text-4xl md:text-6xl text-center mb-4">Let's Build It.</h1>
          <p className="text-center text-muted-foreground text-lg mb-16 max-w-xl mx-auto">
            Ready to build something bold? Fill out the form to book a consultation, or reach out directly.
          </p>

          {/* Form */}
          <div className="glass-card p-8 md:p-10 mb-16">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-foreground/70 text-sm">Name</Label>
                  <Input id="name" placeholder="Jane Smith" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground/70 text-sm">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="business" className="text-foreground/70 text-sm">Business Name</Label>
                <Input id="business" placeholder="Your Business" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className={inputClass} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message" className="text-foreground/70 text-sm">Message</Label>
                <Textarea id="message" placeholder="Tell me about your project..." value={message} onChange={(e) => setMessage(e.target.value)} rows={5} className={`${inputClass} resize-none`} />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-full py-6 bg-primary hover:bg-primary/90 text-primary-foreground transition-all hover:-translate-y-0.5 mt-2"
              >
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                ) : (
                  <>Pay $50 & Book Consultation <ArrowRight className="ml-2 h-4 w-4" /></>
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Secure payment via Stripe. Your $50 is credited toward your project total.
              </p>
            </form>
          </div>

          {/* Direct Contact */}
          <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4">
            <a href="mailto:aethyxspace@protonmail.com" className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors">
              <Mail className="h-5 w-5 text-primary shrink-0" />
              <span className="text-sm break-all">aethyxspace@protonmail.com</span>
            </a>
            <a href="tel:+14015891023" className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors">
              <Phone className="h-5 w-5 text-primary shrink-0" />
              <span className="text-sm">401.589.1023</span>
            </a>
            <a href="https://www.facebook.com/Aethyxspace/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors">
              <Facebook className="h-5 w-5 text-primary shrink-0" />
              <span className="text-sm">Facebook</span>
            </a>
            <div className="flex items-center gap-3 text-muted-foreground">
              <MapPin className="h-5 w-5 text-primary shrink-0" />
              <span className="text-sm">Rhode Island • Serving USA</span>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Contact;
