import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle, Loader2 } from "lucide-react";
import Header from "@/components/Header";

const GOOGLE_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLScleBGGZeacHU4B-gGHDPiZFzOwpPHu8n_80DkwiypsB2nlEw/viewform";

const PaymentSuccess = () => {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = GOOGLE_FORM_URL;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleGoToForm = () => {
    window.location.href = GOOGLE_FORM_URL;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="relative z-10 overflow-hidden">
        <div className="relative px-6 pt-32 pb-24 md:px-12 lg:px-24 xl:px-32 md:pt-40 md:pb-32">
          <div className="max-w-2xl mx-auto text-center">
            <div className="card-elevated rounded-3xl p-10 md:p-14">
              <div className="w-16 h-16 rounded-full bg-sage-light flex items-center justify-center mx-auto mb-8">
                <CheckCircle className="h-8 w-8 text-sage" />
              </div>
              
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-medium leading-[1.15] text-foreground mb-6 tracking-tight">
                Payment Successful!
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed font-light mb-4">
                Thank you for your payment! A receipt has been sent to your email.
              </p>
              
              <p className="text-base text-muted-foreground leading-relaxed font-light mb-8">
                Your comprehensive review and personalized action plan will be delivered to your inbox within <span className="font-semibold text-foreground">48 hours</span>. 
                Remember, this $50 fee will be credited toward your final project total when you decide to work together.
              </p>

              <div className="bg-sage-light/50 rounded-2xl p-6 mb-8">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Loader2 className="h-5 w-5 text-sage animate-spin" />
                  <h3 className="text-lg font-medium text-foreground">Redirecting in {countdown} seconds...</h3>
                </div>
                <p className="text-sm text-muted-foreground font-light">
                  You'll be automatically redirected to complete the client intake form.
                </p>
              </div>
              
              <Button 
                onClick={handleGoToForm}
                size="lg" 
                className="text-base px-12 py-8 rounded-full bg-sage hover:bg-sage/90 text-white shadow-warm transition-all duration-300 hover:shadow-warm-lg hover:-translate-y-0.5"
              >
                Go to Form Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-cream-deep border-t border-border/30">
        <div className="px-6 py-12 md:px-12 lg:px-24 xl:px-32">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-sm text-muted-foreground font-light">
              © {new Date().getFullYear()} Vibe Shift Studio. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PaymentSuccess;
