import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck, ArrowLeft, CheckCircle2 } from "lucide-react";

interface InvoiceData {
  id: string;
  invoice_number: string | null;
  amount_due: number;
  description: string | null;
  status: string;
}

const PaymentForm = ({ amount, onSuccess }: { amount: number; onSuccess: () => void }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);
    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message || "Payment validation failed");
      setSubmitting(false);
      return;
    }
    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/portal/payments`,
      },
      redirect: "if_required",
    });
    if (confirmError) {
      setError(confirmError.message || "Payment failed");
      setSubmitting(false);
      toast({ title: "Payment failed", description: confirmError.message, variant: "destructive" });
      return;
    }
    toast({ title: "Payment successful", description: "Thank you — a receipt is on its way." });
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement
        options={{
          layout: "tabs",
        }}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-base font-medium"
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <ShieldCheck className="h-4 w-4 mr-2" />
        )}
        Pay ${(amount / 100).toFixed(2)}
      </Button>
      <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
        <ShieldCheck className="h-3 w-3" /> Secured by bank-grade encryption
      </p>
    </form>
  );
};

const PortalPay = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [amount, setAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (!invoiceId) return;
      const { data: inv, error: invErr } = await supabase
        .from("client_invoices")
        .select("id, invoice_number, amount_due, description, status")
        .eq("id", invoiceId)
        .maybeSingle();
      if (invErr || !inv) {
        toast({ title: "Invoice not found", variant: "destructive" });
        setLoading(false);
        return;
      }
      setInvoice(inv as InvoiceData);
      if (inv.status === "paid") {
        setPaid(true);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.functions.invoke("create-invoice-payment-intent", {
        body: { invoiceId },
      });
      if (error || !data?.clientSecret) {
        toast({ title: "Could not initialize payment", description: data?.error || error?.message, variant: "destructive" });
        setLoading(false);
        return;
      }
      if (data.alreadyPaid) {
        setPaid(true);
        setLoading(false);
        return;
      }
      setClientSecret(data.clientSecret);
      setAmount(data.amount);
      setStripePromise(loadStripe(data.publishableKey));
      setLoading(false);
    };
    init();
  }, [invoiceId, toast]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (paid) {
    return (
      <div className="max-w-lg mx-auto py-12">
        <Card className="border-border/30 bg-card">
          <CardContent className="text-center py-12">
            <CheckCircle2 className="h-14 w-14 text-primary mx-auto mb-4" />
            <h2 className="font-display text-2xl mb-2">This invoice is paid</h2>
            <p className="text-muted-foreground text-sm mb-6">Thanks for taking care of it.</p>
            <Button variant="outline" onClick={() => navigate("/portal/payments")}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to portal
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto py-8">
      <Button variant="ghost" size="sm" onClick={() => navigate("/portal/payments")} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to invoices
      </Button>

      <Card className="border-border/30 mb-4">
        <CardContent className="pt-6">
          <p className="text-xs text-muted-foreground tracking-wider uppercase mb-1">Invoice</p>
          <p className="font-display text-lg mb-3">{invoice?.invoice_number || "—"}</p>
          {invoice?.description && (
            <>
              <p className="text-xs text-muted-foreground tracking-wider uppercase mb-1">For</p>
              <p className="text-sm mb-3">{invoice.description}</p>
            </>
          )}
          <p className="text-xs text-muted-foreground tracking-wider uppercase mb-1">Amount due</p>
          <p className="font-display text-3xl text-primary">${(amount / 100).toFixed(2)}</p>
        </CardContent>
      </Card>

      {clientSecret && stripePromise && (
        <Card className="border-border/30">
          <CardContent className="pt-6">
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: "night",
                  variables: {
                    colorPrimary: "#00E6D8",
                    colorBackground: "#0a0a14",
                    colorText: "#ffffff",
                    colorDanger: "#ff4444",
                    fontFamily: "Inter, system-ui, sans-serif",
                    borderRadius: "6px",
                  },
                  rules: {
                    ".Input": { border: "1px solid rgba(255,255,255,0.1)" },
                    ".Input:focus": { borderColor: "#00E6D8", boxShadow: "0 0 0 1px #00E6D8" },
                    ".Tab": { border: "1px solid rgba(255,255,255,0.1)" },
                    ".Tab--selected": { borderColor: "#00E6D8" },
                  },
                },
              }}
            >
              <PaymentForm amount={amount} onSuccess={() => setPaid(true)} />
            </Elements>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PortalPay;
