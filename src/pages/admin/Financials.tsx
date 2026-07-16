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
import { Plus, Pencil, Trash2, RefreshCw, Mail, ExternalLink, Settings2, Loader2 } from "lucide-react";

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
  entry_type: "income" | "expense";
}

const emptyForm = {
  client_name: "",
  service_name: "",
  amount: "",
  payment_status: "pending",
  payment_date: "",
  stripe_session_id: "",
  notes: "",
  entry_type: "income" as "income" | "expense",
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
  const [entryTypeFilter, setEntryTypeFilter] = useState<"all" | "income" | "expense">("all");

  const [scanningInbox, setScanningInbox] = useState(false);
  const [gmailDialogOpen, setGmailDialogOpen] = useState(false);
  const [consentUrl, setConsentUrl] = useState<string | null>(null);
  const [authCode, setAuthCode] = useState("");
  const [connectingGmail, setConnectingGmail] = useState(false);

  interface ExpenseVendor { id: string; vendor_name: string; sender_domain: string; active: boolean }
  const [vendorsOpen, setVendorsOpen] = useState(false);
  const [vendors, setVendors] = useState<ExpenseVendor[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [newVendorName, setNewVendorName] = useState("");
  const [newVendorDomain, setNewVendorDomain] = useState("");
  const [savingVendor, setSavingVendor] = useState(false);

  const fetchVendors = async () => {
    setVendorsLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from("expense_email_senders").select("*").order("vendor_name");
    setVendors((data as ExpenseVendor[]) || []);
    setVendorsLoading(false);
  };

  const addVendor = async () => {
    const name = newVendorName.trim();
    // Accept a bare domain or a full email/URL — keep just the domain part.
    const domain = newVendorDomain.trim().toLowerCase()
      .replace(/^https?:\/\//, "").replace(/^.*@/, "").split("/")[0];
    if (!name || !domain.includes(".")) {
      toast({ title: "Enter a vendor name and a sender domain like canva.com", variant: "destructive" });
      return;
    }
    setSavingVendor(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("expense_email_senders").insert({ vendor_name: name, sender_domain: domain });
    setSavingVendor(false);
    if (error) {
      toast({ title: "Could not add vendor", description: error.message, variant: "destructive" });
      return;
    }
    setNewVendorName("");
    setNewVendorDomain("");
    fetchVendors();
  };

  const toggleVendor = async (v: ExpenseVendor) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("expense_email_senders").update({ active: !v.active }).eq("id", v.id);
    setVendors((s) => s.map((x) => x.id === v.id ? { ...x, active: !x.active } : x));
  };

  const removeVendor = async (v: ExpenseVendor) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("expense_email_senders").delete().eq("id", v.id);
    if (error) {
      toast({ title: "Could not remove vendor", description: error.message, variant: "destructive" });
      return;
    }
    setVendors((s) => s.filter((x) => x.id !== v.id));
  };

  // Scan Gmail for subscription receipts (Claude, Canva, ChatGPT, …) and post
  // them as expenses. First run walks through a one-time Google consent.
  const handleScanInbox = async () => {
    setScanningInbox(true);
    try {
      const { data, error } = await supabase.functions.invoke("capture-expense-emails", { body: {} });
      if (error) throw error;
      if (data?.needsAuth) {
        setConsentUrl(data.consentUrl || null);
        setGmailDialogOpen(true);
        return;
      }
      if (data?.apiDisabled) {
        // Not an auth problem — the Gmail API is off in Google Cloud. Re-consenting
        // can't fix it, so don't reopen the connect dialog.
        toast({ title: "One more step: enable the Gmail API", description: data.error, duration: 15000 });
        return;
      }
      if (!data?.ok) throw new Error(data?.error || "Scan failed");
      toast({
        title: "Inbox scan complete",
        description: data.captured
          ? `Captured ${data.captured} expense(s) totaling $${Number(data.totalAmount).toFixed(2)} (${data.scanned} new emails examined).`
          : `No new receipts found (${data.scanned} new emails examined, ${data.alreadyProcessed} already processed).`,
      });
      fetchRecords();
    } catch (e) {
      toast({ title: "Inbox scan failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    } finally {
      setScanningInbox(false);
    }
  };

  const handleConnectGmail = async () => {
    if (!authCode.trim()) return;
    setConnectingGmail(true);
    try {
      const { data, error } = await supabase.functions.invoke("capture-expense-emails", {
        body: { authCode: authCode.trim() },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Connection failed");
      setGmailDialogOpen(false);
      setAuthCode("");
      toast({ title: "Gmail connected", description: "Scanning your inbox for receipts now…" });
      handleScanInbox();
    } catch (e) {
      toast({ title: "Gmail connection failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    } finally {
      setConnectingGmail(false);
    }
  };

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
      entry_type: (r.entry_type as "income" | "expense") || "income",
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
      entry_type: form.entry_type,
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

  const filteredRecords = records.filter((r) => entryTypeFilter === "all" || r.entry_type === entryTypeFilter);
  const totalIncome = records.filter((r) => r.entry_type !== "expense" && r.payment_status === "paid").reduce((s, r) => s + Number(r.amount), 0);
  const totalExpenses = records.filter((r) => r.entry_type === "expense" && r.payment_status === "paid").reduce((s, r) => s + Number(r.amount), 0);
  const totalPaid = totalIncome - totalExpenses;
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
          <Button onClick={() => { setVendorsOpen(true); fetchVendors(); }} size="sm" variant="ghost" title="Manage receipt vendors">
            <Settings2 className="h-4 w-4 mr-1" /> Vendors
          </Button>
          <Button onClick={handleScanInbox} size="sm" variant="outline" disabled={scanningInbox}>
            <Mail className={`h-4 w-4 mr-1 ${scanningInbox ? "animate-pulse" : ""}`} />
            {scanningInbox ? "Scanning…" : "Scan Inbox for Receipts"}
          </Button>
          <Button onClick={handleStripeSync} size="sm" variant="outline" disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing…" : "Sync from Stripe"}
          </Button>
          <Button onClick={openNew} size="sm"><Plus className="h-4 w-4 mr-1" /> New Record</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg border border-border/30 p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Net (Income − Expenses)</p>
          <p className="text-2xl font-bold text-emerald-400">${totalPaid.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">${totalIncome.toLocaleString()} income · ${totalExpenses.toLocaleString()} expenses</p>
        </div>
        <div className="rounded-lg border border-border/30 p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Pending (Open Invoices)</p>
          <p className="text-2xl font-bold text-yellow-400">${totalPending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-xs text-muted-foreground mt-1">{openInvoicesCount} unpaid invoice{openInvoicesCount === 1 ? "" : "s"}</p>
        </div>
        <div className="rounded-lg border border-border/30 p-4 flex flex-col justify-center">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Filter</Label>
          <Select value={entryTypeFilter} onValueChange={(v) => setEntryTypeFilter(v as typeof entryTypeFilter)}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="income">Income only</SelectItem>
              <SelectItem value="expense">Expenses only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : filteredRecords.length === 0 ? (
        <p className="text-muted-foreground text-center py-10">No financial records yet.</p>
      ) : (
        <div className="rounded-lg border border-border/30 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Client / Vendor</TableHead>
                <TableHead className="hidden md:table-cell">Service</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <span className={`text-xs px-2 py-1 rounded-full ${r.entry_type === "expense" ? "bg-red-500/20 text-red-400" : "bg-blue-500/20 text-blue-400"}`}>
                      {r.entry_type === "expense" ? "Expense" : "Income"}
                    </span>
                  </TableCell>
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
                <Label>Type</Label>
                <Select value={form.entry_type} onValueChange={(v) => setForm((f) => ({ ...f, entry_type: v as "income" | "expense" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{form.entry_type === "expense" ? "Vendor *" : "Client Name *"}</Label>
                <Input
                  value={form.client_name}
                  onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))}
                  placeholder={form.entry_type === "expense" ? "e.g. Anthropic" : undefined}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
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

      {/* Receipt-capture vendor watch list */}
      <Dialog open={vendorsOpen} onOpenChange={setVendorsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Receipt capture vendors</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              Emails from these senders are scanned for receipts and posted as expenses.
              Pausing a vendor stops new captures without deleting anything already recorded.
            </p>
            {vendorsLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {vendors.map((v) => (
                  <div key={v.id} className="flex items-center gap-3 rounded-md border border-border/30 px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${v.active ? "" : "text-muted-foreground line-through"}`}>{v.vendor_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{v.sender_domain}</p>
                    </div>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toggleVendor(v)}>
                      {v.active ? "Pause" : "Resume"}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeVendor(v)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {vendors.length === 0 && <p className="text-muted-foreground text-center py-4">No vendors yet.</p>}
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Input value={newVendorName} onChange={(e) => setNewVendorName(e.target.value)} placeholder="Vendor name (e.g. Adobe)" />
              <Input value={newVendorDomain} onChange={(e) => setNewVendorDomain(e.target.value)} placeholder="Sender domain (adobe.com)" onKeyDown={(e) => { if (e.key === "Enter") addVendor(); }} />
              <Button onClick={addVendor} disabled={savingVendor}>
                {savingVendor ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* One-time Gmail consent for receipt capture */}
      <Dialog open={gmailDialogOpen} onOpenChange={setGmailDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Connect Gmail for receipt capture</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              One-time setup: give the app read-only access to your Gmail so it can find
              subscription receipts (Claude, Canva, ChatGPT, Proton, Linktree…).
            </p>
            <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
              <li>
                {consentUrl ? (
                  <a href={consentUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1">
                    Open Google consent <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  "Open the Google consent link"
                )}{" "}
                and approve with your kmitch2087 account.
              </li>
              <li>You'll land on Google's OAuth Playground — copy the <strong>authorization code</strong> shown there (or the <code>code=</code> value from the address bar).</li>
              <li>Paste it below.</li>
            </ol>
            <Input
              value={authCode}
              onChange={(e) => setAuthCode(e.target.value)}
              placeholder="Paste authorization code (starts with 4/…)"
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setGmailDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleConnectGmail} disabled={!authCode.trim() || connectingGmail}>
                {connectingGmail ? "Connecting…" : "Connect & Scan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Financials;
