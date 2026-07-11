import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  FileText, Plus, Loader2, RefreshCcw, ExternalLink, MoreHorizontal,
  Mail, Link as LinkIcon, CheckCircle2, XCircle, Bell, RotateCcw, Download, Send,
} from "lucide-react";
import { format } from "date-fns";

interface Profile {
  id: string;
  full_name: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  stripe_customer_id: string | null;
}

interface Invoice {
  id: string;
  invoice_number: string | null;
  amount_due: number;
  amount_paid: number;
  status: string;
  description: string | null;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  stripe_invoice_id: string | null;
  created_at: string;
  email: string | null;
  client_profile_id: string | null;
}

const Invoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Email composer
  const [emailInv, setEmailInv] = useState<Invoice | null>(null);
  const [emailRecipient, setEmailRecipient] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");

  // Refund
  const [refundInv, setRefundInv] = useState<Invoice | null>(null);
  const [refundAmount, setRefundAmount] = useState("");

  const [profileId, setProfileId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [daysUntilDue, setDaysUntilDue] = useState("14");

  const [syncEmail, setSyncEmail] = useState("");
  const [syncName, setSyncName] = useState("");
  const [inviteAfterSync, setInviteAfterSync] = useState(true);

  const { toast } = useToast();

  const fetchAll = async () => {
    const [invRes, profRes] = await Promise.all([
      supabase.from("client_invoices").select("*").order("created_at", { ascending: false }),
      supabase.from("client_profiles").select("id, full_name, email, first_name, last_name, stripe_customer_id").order("full_name"),
    ]);
    setInvoices((invRes.data as Invoice[]) || []);
    setProfiles((profRes.data as Profile[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleCreate = async (finalize: boolean) => {
    if (!profileId || !description.trim() || !amount) return;
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("create-admin-invoice", {
      body: { profileId, description: description.trim(), amount: Number(amount), daysUntilDue: Number(daysUntilDue) || 14, finalize },
    });
    setSubmitting(false);
    if (error || !data?.success) {
      toast({ title: "Failed to create invoice", description: data?.error || error?.message, variant: "destructive" }); return;
    }
    toast({
      title: finalize ? "Invoice created" : "Draft saved",
      description: finalize ? "Client has been notified by email." : "Not sent yet — finalize and send when ready.",
    });
    setCreateOpen(false); setDescription(""); setAmount(""); setProfileId("");
    fetchAll();
  };

  const handleSync = async () => {
    if (!syncEmail.trim()) return;
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("sync-stripe-customer", {
      body: { email: syncEmail.trim(), fullName: syncName.trim() || undefined },
    });
    if (error || !data?.success) {
      setSubmitting(false);
      toast({ title: "Sync failed", description: data?.error || error?.message, variant: "destructive" }); return;
    }
    toast({ title: "Synced from Stripe", description: `${data.invoicesUpserted} invoice(s) imported.` });
    if (inviteAfterSync) {
      const inviteRes = await supabase.functions.invoke("provision-client-portal", {
        body: { email: syncEmail.trim(), firstName: syncName.trim().split(/\s+/)[0] || undefined, profileId: data.profileId },
      });
      if (inviteRes.error) toast({ title: "Invite email failed", description: inviteRes.error.message, variant: "destructive" });
      else toast({ title: "Portal invite sent" });
    }
    setSubmitting(false); setSyncOpen(false); setSyncEmail(""); setSyncName("");
    fetchAll();
  };

  const runAction = async (inv: Invoice, action: string, body: Record<string, any> = {}) => {
    const { error, data } = await supabase.functions.invoke("invoice-actions", {
      body: { action, invoiceRowId: inv.id, ...body },
    });
    if (error || data?.error) {
      toast({ title: "Action failed", description: data?.error || error?.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Done" });
    fetchAll();
    return true;
  };

  const openEmail = (inv: Invoice) => {
    setEmailInv(inv);
    const profile = profiles.find((p) => p.id === inv.client_profile_id);
    setEmailRecipient(inv.email || profile?.email || "");
    setEmailSubject(`Invoice ${inv.invoice_number || ""} from Aethyx`);
    setEmailMessage("");
  };

  const submitEmail = async () => {
    if (!emailInv || !emailRecipient.trim()) return;
    setSubmitting(true);
    const ok = await runAction(emailInv, "email_to_client", {
      recipientEmail: emailRecipient.trim(), subject: emailSubject, message: emailMessage,
    });
    setSubmitting(false);
    if (ok) setEmailInv(null);
  };

  const submitRefund = async () => {
    if (!refundInv) return;
    setSubmitting(true);
    const ok = await runAction(refundInv, "refund", refundAmount ? { amount: Number(refundAmount) } : {});
    setSubmitting(false);
    if (ok) { setRefundInv(null); setRefundAmount(""); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-display tracking-wider flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" /> Invoices
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setSyncOpen(true)}><RefreshCcw className="h-4 w-4 mr-2" /> Sync from Stripe</Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" /> New Invoice</Button>
        </div>
      </div>

      {invoices.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No invoices yet.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => {
            const profile = profiles.find((p) => p.id === inv.client_profile_id);
            const isStripe = !!inv.stripe_invoice_id;
            const canRefund = isStripe && (inv.amount_paid > 0);
            return (
              <Card key={inv.id}>
                <CardContent className="pt-4 flex items-center justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{inv.invoice_number || "—"}</span>
                      <Badge variant={inv.status === "paid" ? "default" : "secondary"} className="capitalize text-xs">{inv.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {profile?.full_name || inv.email || "—"} · {inv.description || "No description"}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">{format(new Date(inv.created_at), "MMM d, yyyy")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-lg">${Number(inv.amount_due).toFixed(2)}</span>
                    {inv.hosted_invoice_url && (
                      <Button variant="ghost" size="sm" asChild title="View hosted invoice">
                        <a href={inv.hosted_invoice_url} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3" /></a>
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem onClick={() => openEmail(inv)}>
                          <Mail className="h-4 w-4 mr-2" /> Email to client
                        </DropdownMenuItem>
                        {inv.invoice_pdf && (
                          <DropdownMenuItem asChild>
                            <a href={inv.invoice_pdf} target="_blank" rel="noreferrer"><Download className="h-4 w-4 mr-2" />Download PDF</a>
                          </DropdownMenuItem>
                        )}
                        {inv.hosted_invoice_url && (
                          <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(inv.hosted_invoice_url!); toast({ title: "Payment link copied" }); }}>
                            <LinkIcon className="h-4 w-4 mr-2" /> Copy payment link
                          </DropdownMenuItem>
                        )}
                        {isStripe && inv.status === "draft" && (
                          <DropdownMenuItem onClick={() => runAction(inv, "finalize_and_send")}>
                            <Send className="h-4 w-4 mr-2" /> Finalize &amp; send
                          </DropdownMenuItem>
                        )}
                        {isStripe && inv.status !== "paid" && inv.status !== "draft" && (
                          <>
                            <DropdownMenuItem onClick={() => runAction(inv, "send_reminder")}><Bell className="h-4 w-4 mr-2" /> Send Stripe reminder</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => runAction(inv, "mark_paid")}><CheckCircle2 className="h-4 w-4 mr-2" /> Mark as paid</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => runAction(inv, "void")}><XCircle className="h-4 w-4 mr-2" /> Void</DropdownMenuItem>
                          </>
                        )}
                        {canRefund && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => { setRefundInv(inv); setRefundAmount(""); }} className="text-destructive">
                              <RotateCcw className="h-4 w-4 mr-2" /> Refund
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New Invoice</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Client</Label>
              <Select value={profileId} onValueChange={setProfileId}>
                <SelectTrigger><SelectValue placeholder="Select a client" /></SelectTrigger>
                <SelectContent>
                  {profiles.filter((p) => p.email).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name} ({p.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={500} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Amount (USD)</Label><Input type="number" step="0.01" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
              <div><Label>Due in (days)</Label><Input type="number" min="1" value={daysUntilDue} onChange={(e) => setDaysUntilDue(e.target.value)} /></div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handleCreate(false)}
                disabled={submitting || !profileId || !description.trim() || !amount}
                variant="outline"
                className="flex-1"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Save as draft
              </Button>
              <Button onClick={() => handleCreate(true)} disabled={submitting || !profileId || !description.trim() || !amount} className="flex-1">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Create & send
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sync */}
      <Dialog open={syncOpen} onOpenChange={setSyncOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Sync client from Stripe</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Email</Label><Input type="email" value={syncEmail} onChange={(e) => setSyncEmail(e.target.value)} /></div>
            <div><Label>Full name (optional)</Label><Input value={syncName} onChange={(e) => setSyncName(e.target.value)} /></div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={inviteAfterSync} onChange={(e) => setInviteAfterSync(e.target.checked)} />
              Send portal invite after sync
            </label>
            <Button onClick={handleSync} disabled={submitting || !syncEmail.trim()} className="w-full">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Sync
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email composer */}
      <Dialog open={!!emailInv} onOpenChange={(o) => !o && setEmailInv(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Email invoice to client</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>To</Label><Input type="email" value={emailRecipient} onChange={(e) => setEmailRecipient(e.target.value)} /></div>
            <div><Label>Subject</Label><Input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} /></div>
            <div><Label>Personal message (optional)</Label><Textarea rows={4} value={emailMessage} onChange={(e) => setEmailMessage(e.target.value)} /></div>
            <p className="text-xs text-muted-foreground">A secure link to the hosted invoice and PDF will be included automatically.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEmailInv(null)} disabled={submitting}>Cancel</Button>
              <Button onClick={submitEmail} disabled={submitting || !emailRecipient.trim()}>{submitting ? "Sending…" : "Send"}</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Refund */}
      <Dialog open={!!refundInv} onOpenChange={(o) => !o && setRefundInv(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Refund invoice</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Leave blank to refund the full amount paid (${refundInv?.amount_paid.toFixed(2)}).</p>
            <div><Label>Amount (USD)</Label><Input type="number" step="0.01" min="0.01" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} placeholder="Full refund" /></div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRefundInv(null)} disabled={submitting}>Cancel</Button>
              <Button onClick={submitRefund} disabled={submitting} variant="destructive">{submitting ? "Refunding…" : "Confirm refund"}</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Invoices;
