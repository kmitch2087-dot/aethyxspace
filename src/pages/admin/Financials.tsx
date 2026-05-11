import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Plus, Pencil, Trash2, RefreshCw } from "lucide-react";

interface FinancialRecord {
  id: string;
  client_name: string;
  service_name: string | null;
  amount: number;
  payment_status: string;
  payment_date: string | null;
  stripe_session_id: string | null;
  notes: string | null;
  created_at: string;
}

const emptyForm = {
  client_name: "",
  service_name: "",
  amount: "",
  payment_status: "pending",
  payment_date: "",
  stripe_session_id: "",
  notes: "",
};

const Financials = () => {
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<FinancialRecord | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [syncing, setSyncing] = useState(false);
  const [openInvoicesTotal, setOpenInvoicesTotal] = useState(0);
  const [openInvoicesCount, setOpenInvoicesCount] = useState(0);

  const handleStripeSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-sync");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({
        title: "Stripe sync complete",
        description: `${data.inserted} new, ${data.updated} updated, ${data.skipped} skipped (of ${data.total} charges). Invoices refreshed: ${data.invoicesSynced ?? 0}.`,
      });
      fetchRecords();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Sync failed";
      toast({ title: "Stripe sync failed", description: msg, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const fetchRecords = async () => {
    const { data } = await supabase
      .from("financial_records")
      .select("*")
      .order("created_at", { ascending: false });
    setRecords(data || []);

    // Pending = open/unpaid invoices from Stripe-synced client_invoices
    const { data: openInvoices } = await supabase
      .from("client_invoices")
      .select("amount_due, amount_paid, status")
      .in("status", ["open", "draft", "uncollectible"]);
    const outstanding = (openInvoices || []).reduce(
      (s, i) => s + Math.max(0, Number(i.amount_due || 0) - Number(i.amount_paid || 0)),
      0
    );
    setOpenInvoicesTotal(outstanding);
    setOpenInvoicesCount((openInvoices || []).length);

    setLoading(false);
  };

  useEffect(() => { fetchRecords(); }, []);

  const openNew = () => { setEditing(null); setForm(emptyForm); setEditorOpen(true); };

  const openEdit = (r: FinancialRecord) => {
    setEditing(r);
    setForm({
      client_name: r.client_name,
      service_name: r.service_name || "",
      amount: r.amount.toString(),
      payment_status: r.payment_status,
      payment_date: r.payment_date ? r.payment_date.split("T")[0] : "",
      stripe_session_id: r.stripe_session_id || "",
      notes: r.notes || "",
    });
    setEditorOpen(true);
  };

  const handleSave = async () => {
    if (!form.client_name.trim() || !form.amount) {
      toast({ title: "Client name & amount are required", variant: "destructive" });
      return;
    }
    const payload = {
      client_name: form.client_name,
      service_name: form.service_name || null,
      amount: parseFloat(form.amount),
      payment_status: form.payment_status,
      payment_date: form.payment_date ? new Date(form.payment_date).toISOString() : null,
      stripe_session_id: form.stripe_session_id || null,
      notes: form.notes || null,
    };

    if (editing) {
      const { error } = await supabase.from("financial_records").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Record updated!" });
    } else {
      const { error } = await supabase.from("financial_records").insert(payload);
      if (error) { toast({ title: "Create failed", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Record created!" });
    }
    setEditorOpen(false);
    fetchRecords();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this record?")) return;
    await supabase.from("financial_records").delete().eq("id", id);
    toast({ title: "Record deleted" });
    fetchRecords();
  };

  const totalPaid = records.filter((r) => r.payment_status === "paid").reduce((s, r) => s + Number(r.amount), 0);
  const totalPending = openInvoicesTotal;

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-500/20 text-yellow-400",
      paid: "bg-emerald-500/20 text-emerald-400",
      refunded: "bg-destructive/20 text-destructive",
    };
    return <span className={`text-xs px-2 py-1 rounded-full ${styles[status] || "bg-muted text-muted-foreground"}`}>{status}</span>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display tracking-wider">Financials</h1>
        <div className="flex items-center gap-2">
          <Button onClick={handleStripeSync} size="sm" variant="outline" disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing…" : "Sync from Stripe"}
          </Button>
          <Button onClick={openNew} size="sm"><Plus className="h-4 w-4 mr-1" /> New Record</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-lg border border-border/30 p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Paid</p>
          <p className="text-2xl font-bold text-emerald-400">${totalPaid.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-border/30 p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Pending (Open Invoices)</p>
          <p className="text-2xl font-bold text-yellow-400">${totalPending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-xs text-muted-foreground mt-1">{openInvoicesCount} unpaid invoice{openInvoicesCount === 1 ? "" : "s"}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : records.length === 0 ? (
        <p className="text-muted-foreground text-center py-10">No financial records yet.</p>
      ) : (
        <div className="rounded-lg border border-border/30 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead className="hidden md:table-cell">Service</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.client_name}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{r.service_name || "—"}</TableCell>
                  <TableCell>${Number(r.amount).toLocaleString()}</TableCell>
                  <TableCell>{statusBadge(r.payment_status)}</TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                    {r.payment_date ? format(new Date(r.payment_date), "MMM d, yyyy") : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display tracking-wider">{editing ? "Edit Record" : "New Financial Record"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client Name *</Label>
                <Input value={form.client_name} onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Service</Label>
                <Input value={form.service_name} onChange={(e) => setForm((f) => ({ ...f, service_name: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount ($) *</Label>
                <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.payment_status} onValueChange={(v) => setForm((f) => ({ ...f, payment_status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Date</Label>
                <Input type="date" value={form.payment_date} onChange={(e) => setForm((f) => ({ ...f, payment_date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Stripe Session ID</Label>
                <Input value={form.stripe_session_id} onChange={(e) => setForm((f) => ({ ...f, stripe_session_id: e.target.value }))} placeholder="Optional" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}>{editing ? "Update" : "Create"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Financials;
