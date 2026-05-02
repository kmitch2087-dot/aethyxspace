import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, FileText, MessageCircle, CreditCard, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const GOOGLE_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLScleBGGZeacHU4B-gGHDPiZFzOwpPHu8n_80DkwiypsB2nlEw/viewform";

interface ServiceSelectionPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceName?: string;
}

const ServiceSelectionPopup = ({ open, onOpenChange, serviceName }: ServiceSelectionPopupProps) => {
  const [showPayment, setShowPayment] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleClose = () => {
    setShowPayment(false);
    setEmail("");
    setName("");
    onOpenChange(false);
  };

  const handleQuickConsultation = () => {
    window.open(GOOGLE_FORM_URL, "_blank");
    handleClose();
  };

  const handleComprehensiveAnalysis = () => {
    setShowPayment(true);
  };

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
        // Redirect to Stripe Checkout in the same tab
        // After payment, they'll be redirected to payment-success which will send them to the form
        window.location.href = data.url;
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

  const handleBack = () => {
    setShowPayment(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg md:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display text-foreground">
            {showPayment ? "Complete Your Payment" : "How Would You Like to Begin?"}
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            {showPayment 
              ? "Enter your details to proceed with the comprehensive analysis." 
              : serviceName 
                ? `You've selected ${serviceName}. Choose how you'd like to get started.`
                : "Choose the option that best fits your needs."
            }
          </DialogDescription>
        </DialogHeader>

        {!showPayment ? (
          <div className="grid gap-6 py-4">
            {/* Option 1: Comprehensive Analysis */}
            <div className="card-elevated rounded-2xl p-6 border-2 border-transparent hover:border-sage/30 transition-all">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-sage-light flex items-center justify-center flex-shrink-0">
                  <FileText className="h-6 w-6 text-sage" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-foreground">Comprehensive Website Analysis</h3>
                    <span className="px-3 py-1 bg-sage text-white text-sm font-semibold rounded-full">$50</span>
                  </div>
                  <p className="text-muted-foreground mb-4 leading-relaxed">
                    Get a detailed report & personalized overview of your current online presence & website versatility. 
                    This analysis will help us determine the perfect package for your specific goals & needs.
                  </p>
                  <ul className="space-y-2 mb-4">
                    <li className="flex items-center gap-2 text-sm text-foreground">
                      <Check className="h-4 w-4 text-sage flex-shrink-0" />
                      <span>In-depth website/brand audit</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm text-foreground">
                      <Check className="h-4 w-4 text-sage flex-shrink-0" />
                      <span>Personalized action plan delivered within 48 hours</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm text-foreground">
                      <Check className="h-4 w-4 text-sage flex-shrink-0" />
                      <span>Package recommendation tailored to your goals</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm text-foreground">
                      <Check className="h-4 w-4 text-sage flex-shrink-0" />
                      <span className="font-medium">$50 credited toward your final project total</span>
                    </li>
                  </ul>
                  <Button 
                    onClick={handleComprehensiveAnalysis}
                    className="w-full rounded-full py-5 bg-sage hover:bg-sage/90 text-white shadow-warm transition-all duration-300 hover:-translate-y-0.5"
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Get My Analysis ($50)
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-muted-foreground text-sm font-medium">OR</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Option 2: Quick Consultation */}
            <div className="card-elevated rounded-2xl p-6 border-2 border-transparent hover:border-ocean/30 transition-all">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-ocean/10 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="h-6 w-6 text-ocean" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-foreground">Quick Overview & Chat</h3>
                    <span className="px-3 py-1 bg-ocean/10 text-ocean text-sm font-semibold rounded-full">Free</span>
                  </div>
                  <p className="text-muted-foreground mb-4 leading-relaxed">
                    Just want to explore your options? Send a quick hello & schedule a 15-minute call 
                    or discuss possibilities over email. No commitment required.
                  </p>
                  <Button 
                    onClick={handleQuickConsultation}
                    variant="outline"
                    className="w-full rounded-full py-5 border-ocean text-ocean hover:bg-ocean/10 transition-all duration-300 hover:-translate-y-0.5"
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Let's Connect
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Payment Form */
          <div className="py-4">
            <button
              onClick={handleBack}
              className="text-sm text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1 transition-colors"
            >
              ← Back to options
            </button>
            
            <div className="card-elevated rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-sage-light flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-sage" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Comprehensive Analysis</h3>
                  <p className="text-sm text-muted-foreground">$50 one-time fee (credited to your project)</p>
                </div>
              </div>

              <form onSubmit={handlePayment} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="payment-name" className="text-sm font-medium text-foreground">
                    Your Name
                  </Label>
                  <Input
                    id="payment-name"
                    type="text"
                    placeholder="Jane Smith"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="rounded-xl border-border/50 focus:border-sage"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment-email" className="text-sm font-medium text-foreground">
                    Email Address <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="payment-email"
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
                      Pay $50 & Continue to Form
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <p className="text-center text-xs text-muted-foreground mt-4 font-light">
                Secure payment. After payment, you'll receive a receipt and be redirected to share a few project details.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ServiceSelectionPopup;
