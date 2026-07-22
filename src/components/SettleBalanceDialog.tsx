import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { allocatePayment } from "@/lib/allocatePayment";

interface QuoteInvoice {
  id: string;
  invoice_number: string | null;
  description: string | null;
  status: string;
  due_date: string | null;
  amount_due: number;
  amount_paid: number;
  remaining: number;
  scheduled: boolean;
}

const stripeAppearance = {
  theme: "night" as const,
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
};

const SettleForm = ({ amountCents, onPaid }: { amountCents: number; onPaid: (piId: string) => void }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/portal/payments` },
      redirect: "if_required",
    });
    if (confirmError) {
      setError(confirmError.message || "Payment failed");
      setSubmitting(false);
      return;
    }
    if (paymentIntent?.id) onPaid(paymentIntent.id);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: "tabs" }} />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={!stripe || submitting} className="w-full h-11">
        {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
        Pay ${(amountCents / 100).toFixed(2)}
      </Button>
      <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
        <ShieldCheck className="h-3 w-3" /> Secured by bank-grade encryption
      </p>
    </form>
  );
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSettled: () => void;
}

const SettleBalanceDialog = ({ open, onOpenChange, onSettled }: Props) => {
  const { toast } = useToast();
  const [step, setStep] = useState<"choose" | "pay" | "done">("choose");
  const [quoteLoading, setQuoteLoading] = useState(true);
  const [invoices, setInvoices] = useState<QuoteInvoice[]>([]);
  const [mode, setMode] = useState<"invoices" | "amount">("invoices");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [customAmount, setCustomAmount] = useState("");
  const [starting, setStarting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [amountCents, setAmountCents] = useState(0);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep("choose");
    setSelected(new Set());
    setCustomAmount("");
    setClientSecret(null);
    setQuoteLoading(true);
    (async () => {
      const { data, error } = await supabase.functions.invoke("settle-balance", { body: { action: "quote" } });
      if (error || !data?.ok) {
        toast({ title: "Couldn't load your balance", description: data?.error || error?.message, variant: "destructive" });
        onOpenChange(false);
        return;
      }
      setInvoices(data.invoices);
      setQuoteLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const totalRemaining = useMemo(() => invoices.reduce((s, i) => s + i.remaining, 0), [invoices]);

  const payAmount = useMemo(() => {
    if (mode === "invoices") {
      return invoices.filter((i) => selected.has(i.id)).reduce((s, i) => s + i.remaining, 0);
    }
    const n = Number(customAmount);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
  }, [mode, invoices, selected, customAmount]);

  // Live oldest-first preview so there's never a surprise about where money lands.
  const preview = useMemo(
    () => allocatePayment(invoices.map((i) => ({ id: i.id, remaining: i.remaining })), payAmount),
    [invoices, payAmount],
  );

  const amountValid = payAmount >= 0.5 && payAmount <= totalRemaining + 0.001;

  const labelFor = (id: string) => {
    const inv = invoices.find((i) => i.id === id);
    if (!inv) return id;
    return inv.invoice_number || inv.description || "Upcoming invoice";
  };

  const startPayment = async () => {
    setStarting(true);
    const body =
      mode === "invoices"
        ? { action: "intent", invoiceIds: Array.from(selected) }
        : { action: "intent", amount: payAmount };
    const { data, error } = await supabase.functions.invoke("settle-balance", { body });
    setStarting(false);
    if (error || !data?.clientSecret) {
      toast({ title: "Couldn't start payment", description: data?.error || error?.message, variant: "destructive" });
      return;
    }
    setClientSecret(data.clientSecret);
    setAmountCents(data.amount);
    setStripePromise(loadStripe(data.publishableKey));
    setStep("pay");
  };

  const confirmAllocation = async (paymentIntentId: string) => {
    setConfirming(true);
    const { data, error } = await supabase.functions.invoke("settle-balance", {
      body: { action: "confirm", paymentIntentId },
    });
    setConfirming(false);
    if (error || !data?.ok) {
      // The charge succeeded — never imply it didn't. Allocation is retried server-side safe.
      toast({
        title: "Payment received",
        description: "We're still applying it to your invoices — refresh in a minute if it doesn't show yet.",
      });
    } else {
      toast({ title: "Payment received", description: "Applied to your oldest balance first. Thank you!" });
    }
    setStep("done");
    onSettled();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Settle your balance</DialogTitle>
          <DialogDescription>
            Pay ahead on upcoming invoices — the full balance, individual invoices, or any amount you choose.
            Payments always apply to your oldest balance first.
          </DialogDescription>
        </DialogHeader>

        {quoteLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : step === "choose" ? (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={mode === "invoices" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("invoices")}
              >
                Pick invoices
              </Button>
              <Button
                variant={mode === "amount" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("amount")}
              >
                Enter an amount
              </Button>
            </div>

            {mode === "invoices" ? (
              <div className="space-y-2">
                {invoices.map((inv) => (
                  <label
                    key={inv.id}
                    className="flex items-center gap-3 rounded-md border border-border/40 p-3 cursor-pointer hover:bg-muted/30"
                  >
                    <Checkbox
                      checked={selected.has(inv.id)}
                      onCheckedChange={(checked) => {
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (checked) next.add(inv.id); else next.delete(inv.id);
                          return next;
                        });
                      }}
                    />
                    <span className="flex-1 min-w-0">
                      <span className="text-sm font-medium block truncate">
                        {inv.invoice_number || inv.description || "Upcoming invoice"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {inv.scheduled && <Badge variant="outline" className="mr-1 text-[10px] border-amber-500/50 text-amber-500">Scheduled</Badge>}
                        {inv.due_date ? `Due ${format(new Date(inv.due_date), "MMM d, yyyy")}` : ""}
                        {inv.amount_paid > 0 && ` · $${inv.amount_paid.toFixed(2)} already paid`}
                      </span>
                    </span>
                    <span className="font-display text-sm">${inv.remaining.toFixed(2)}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input
                    type="number"
                    min="0.50"
                    step="0.01"
                    max={totalRemaining}
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="0.00"
                    className="pl-7"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Your total remaining balance is ${totalRemaining.toFixed(2)}.
                </p>
              </div>
            )}

            {payAmount > 0 && amountValid && (
              <div className="rounded-md bg-muted/30 border border-border/40 p-3 text-xs space-y-1">
                <p className="font-medium text-sm">How this payment will apply (oldest first):</p>
                {preview.map((a) => (
                  <p key={a.id} className="text-muted-foreground">
                    ${a.amount.toFixed(2)} → {labelFor(a.id)}{a.fullyPaid ? " (pays it off)" : " (partial)"}
                  </p>
                ))}
              </div>
            )}
            {payAmount > 0 && !amountValid && (
              <p className="text-xs text-destructive">
                {payAmount < 0.5 ? "Minimum payment is $0.50." : `That's more than your remaining balance of $${totalRemaining.toFixed(2)}.`}
              </p>
            )}

            <Button className="w-full" disabled={!amountValid || starting} onClick={startPayment}>
              {starting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Continue to payment — ${payAmount > 0 ? payAmount.toFixed(2) : "0.00"}
            </Button>
          </div>
        ) : step === "pay" && clientSecret && stripePromise ? (
          <Elements stripe={stripePromise} options={{ clientSecret, appearance: stripeAppearance }}>
            <SettleForm amountCents={amountCents} onPaid={confirmAllocation} />
          </Elements>
        ) : step === "done" ? (
          <div className="text-center py-8">
            {confirming ? (
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-3" />
            ) : (
              <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-3" />
            )}
            <p className="font-display text-lg mb-1">Payment received</p>
            <p className="text-sm text-muted-foreground mb-5">Your balance has been updated — oldest invoices first.</p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default SettleBalanceDialog;
