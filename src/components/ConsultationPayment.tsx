import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, CreditCard, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ConsultationPaymentProps {
  onClose?: () => void;
}

const ConsultationPayment = ({ onClose }: ConsultationPaymentProps) => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handlePayment = async (e: React.FormEvent) => {
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
      const { data, error } = await supabase.functions.invoke("create-consultation-payment", {
        body: { email, name },
      });

      if (error) throw error;

      if (data?.url) {
        // Open Stripe Checkout in a new tab
        window.open(data.url, "_blank");
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error: unknown) {
      console.error("Payment error:", error);
      toast({
        title: "Payment Error",
        description: error instanceof Error ? error.message : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card-elevated rounded-3xl p-8 md:p-10">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-sage-light flex items-center justify-center">
          <CreditCard className="h-5 w-5 text-sage" />
        </div>
        <div>
          <h3 className="text-xl font-medium text-foreground">Book Your Consultation</h3>
          <p className="text-sm text-muted-foreground">$50 one-time fee (credited to your project)</p>
        </div>
      </div>

      <form onSubmit={handlePayment} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium text-foreground">
            Your Name
          </Label>
          <Input
            id="name"
            type="text"
            placeholder="Jane Smith"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-xl border-border/50 focus:border-sage"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-foreground">
            Email Address <span className="text-destructive">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded-xl border-border/50 focus:border-sage"
          />
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-full py-6 bg-sage hover:bg-sage/90 text-white shadow-warm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-warm-lg mt-6"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Pay $50 & Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground mt-4 font-light">
        Secure payment powered by Stripe. Your $50 fee is credited toward your final project total.
      </p>
    </div>
  );
};

export default ConsultationPayment;
