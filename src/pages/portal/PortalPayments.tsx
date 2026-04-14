import { CreditCard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const PortalPayments = () => {
  return (
    <div>
      <h1 className="text-2xl font-display tracking-wider mb-6">Payments</h1>

      <Card className="border-border/30">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <CreditCard className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="font-display text-lg mb-2">Stripe Invoices Coming Soon</h3>
          <p className="text-muted-foreground text-sm max-w-md">
            Your invoices and payment history will appear here once we connect your Stripe billing. 
            You'll be able to view and pay invoices directly from this portal.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortalPayments;
