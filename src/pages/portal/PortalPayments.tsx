import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePortalClientProfile } from "@/hooks/usePortalClientProfile";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";

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
}

const statusVariant = (status: string) => {
  if (status === "paid") return "default";
  if (status === "open") return "secondary";
  return "outline";
};

const PortalPayments = () => {
  const { profile, loading: profileLoading, isViewingAsAdmin } = usePortalClientProfile();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profileLoading) return;
    if (!profile) { setLoading(false); return; }
    (async () => {
      // Explicit client-side scoping, not just RLS — this table's RLS also grants
      // admins unrestricted read access (needed for the admin dashboard), so an
      // unfiltered query here would show an admin session every invoice in the
      // table instead of just the client currently being viewed.
      const { data } = await supabase
        .from("client_invoices")
        .select("id, invoice_number, amount_due, amount_paid, status, description, due_date, paid_at, created_at")
        .eq("client_profile_id", profile.id)
        .order("created_at", { ascending: false });
      setInvoices((data as Invoice[]) || []);
      setLoading(false);
    })();
  }, [profile, profileLoading]);

  if (loading || profileLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-display tracking-wider mb-6">Invoices & Payments</h1>

      {invoices.length === 0 ? (
        <Card className="border-border/30">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <CreditCard className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground text-sm">No invoices yet — they'll appear here as soon as one is sent.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => (
            <Card key={inv.id} className="border-border/30">
              <CardContent className="pt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{inv.invoice_number || "—"}</span>
                    <Badge variant={statusVariant(inv.status)} className="capitalize text-xs">{inv.status}</Badge>
                  </div>
                  {inv.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1">{inv.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {inv.status === "paid" && inv.paid_at
                      ? `Paid ${format(new Date(inv.paid_at), "MMM d, yyyy")}`
                      : inv.due_date
                        ? `Due ${format(new Date(inv.due_date), "MMM d, yyyy")}`
                        : `Issued ${format(new Date(inv.created_at), "MMM d, yyyy")}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-display text-lg">${Number(inv.amount_due).toFixed(2)}</p>
                  </div>
                  {inv.status !== "paid" && !isViewingAsAdmin && (
                    <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                      <Link to={`/portal/pay/${inv.id}`}>Pay now</Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PortalPayments;
