import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle } from "lucide-react";

const PaymentSuccess = () => {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-lg w-full text-center glass-card p-10 md:p-14">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-8">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>

          <h1 className="text-3xl md:text-4xl font-display font-bold leading-tight mb-6">
            Payment Successful!
          </h1>

          <p className="text-lg text-muted-foreground mb-4">
            Thank you! We will be in touch very soon to confirm an appointment!
          </p>

          <p className="text-sm text-muted-foreground/60 mb-10">
            A receipt has been sent to your email. Your $50 consultation fee
            will be credited toward your final project total.
          </p>

          <Link to="/">
            <Button className="rounded-full px-10 py-6 bg-primary hover:bg-primary/85 text-primary-foreground transition-all duration-300 hover:-translate-y-0.5">
              Back to Aethyx
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      <footer className="border-t border-border/20 py-8 px-6 text-center">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Aethyx. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default PaymentSuccess;
