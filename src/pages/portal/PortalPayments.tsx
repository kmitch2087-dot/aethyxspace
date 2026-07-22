import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePortalClientProfile } from "@/hooks/usePortalClientProfile";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, FileText, Loader2, CalendarClock, Sparkles } from "lucide-react";
import { format } from "date-fns";
import SettleBalanceDialog from "@/components/SettleBalanceDialog";

interface Invoice {
  id: string;
  invoice_number: string | null;
  amount_due: number;
  amount_paid: number;
  status: string;
  description: string | null;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
  scheduled_send_at: string | null;
}

const statusVariant = (status: string) => {
  if (status === "paid") return "default";
  if (status === "open") return "secondary";
  return "outline";
};

const isScheduled = (inv: Invoice) => inv.status === "draft" && inv.scheduled_send_at !== null;
const remainingOf = (inv: Invoice) => Math.max(0, Number(inv.amount_due) - Number(inv.amount_paid || 0));

const PortalPayments = () => {
  const { profile, loading: profileLoading, isViewingAsAdmin } = usePortalClientProfile();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [settleOpen, setSettleOpen] = useState(false);

  const load = useCallback(async () => {
    if (!profile) { setLoading(false); return; }
    // Explicit client-side scoping, not just RLS — this table's RLS also grants
    // admins unrestricted read access (needed for the admin dashboard), so an
    // unfiltered query here would show an admin session every invoice in the
    // table instead of just the client currently being viewed.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from("client_invoices")
      .select("id, invoice_number, amount_due, amount_paid, status, description, due_date, paid_at, created_at, scheduled_send_at")
      .eq("client_profile_id", profile.id)
      .order("created_at", { ascending: false });
    // Manual admin drafts (no scheduled_send_at) stay invisible, exactly as before
    // this screen knew about scheduled invoices.
    const visible = ((data as Invoice[]) || []).filter(
      (inv) => inv.status !== "draft" || inv.scheduled_send_at !== null,
    );
    setInvoices(visible);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    if (profileLoading) return;
    load();
  }, [profileLoading, load]);

  const paidToDate = invoices.reduce(
    (s, i) => s + (i.status === "paid" ? Number(i.amount_due) : Number(i.amount_paid || 0)),
    0,
  );
  const payable = invoices.filter((i) => (i.status === "open" || isScheduled(i)) && remainingOf(i) > 0);
  const remainingBalance = payable.reduce((s, i) => s + remainingOf(i), 0);
  const nextDue = payable
    .filter((i) => i.due_date)
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())[0];

  if (loading || profileLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-display tracking-wider mb-6">Invoices & Payments</h1>

      {invoices.length > 0 && (
        <Card className="border-border/30 mb-6">
          <CardContent className="pt-5 grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Paid to date</p>
              <p className="font-display text-xl text-primary">${paidToDate.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Remaining balance</p>
              <p className="font-display text-xl">${remainingBalance.toFixed(2)}</p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Next due</p>
              <p className="font-display text-xl">
                {nextDue?.due_date ? format(new Date(nextDue.due_date), "MMM d, yyyy") : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {invoices.length === 0 ? (
        <Card className="border-border/30">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <CreditCard className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground text-sm">No invoices yet — they'll appear here as soon as one is sent.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => {
            const scheduled = isScheduled(inv);
            const partial = inv.status !== "paid" && Number(inv.amount_paid || 0) > 0;
            return (
              <Card key={inv.id} className={`border-border/30 ${scheduled ? "opacity-70" : ""}`}>
                <CardContent className="pt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {scheduled
                        ? <CalendarClock className="h-4 w-4 text-amber-500" />
                        : <FileText className="h-4 w-4 text-muted-foreground" />}
                      <span className="font-medium text-sm">{inv.invoice_number || (scheduled ? "Upcoming" : "—")}</span>
                      {scheduled ? (
                        <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-500">Scheduled</Badge>
                      ) : (
                        <Badge variant={statusVariant(inv.status)} className="capitalize text-xs">{inv.status}</Badge>
                      )}
                    </div>
                    {inv.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">{inv.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {inv.status === "paid" && inv.paid_at
                        ? `Paid ${format(new Date(inv.paid_at), "MMM d, yyyy")}`
                        : scheduled && inv.due_date
                          ? `Not due yet — due ${format(new Date(inv.due_date), "MMM d, yyyy")}`
                          : inv.due_date
                            ? `Due ${format(new Date(inv.due_date), "MMM d, yyyy")}`
                            : `Issued ${format(new Date(inv.created_at), "MMM d, yyyy")}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-display text-lg">${remainingOf(inv).toFixed(2)}</p>
                      {partial && (
                        <p className="text-xs text-muted-foreground">
                          paid ${Number(inv.amount_paid).toFixed(2)} of ${Number(inv.amount_due).toFixed(2)}
                        </p>
                      )}
                    </div>
                    {inv.status === "open" && !isViewingAsAdmin && (
                      <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                        <Link to={`/portal/pay/${inv.id}`}>Pay now</Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {payable.length > 0 && !isViewingAsAdmin && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Want to settle your balance early or make a partial payment?</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Pay any amount, any time — it always goes toward your oldest balance first.
                    </p>
                  </div>
                </div>
                <Button size="sm" onClick={() => setSettleOpen(true)}>Click here</Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <SettleBalanceDialog open={settleOpen} onOpenChange={setSettleOpen} onSettled={load} />
    </div>
  );
};

export default PortalPayments;
