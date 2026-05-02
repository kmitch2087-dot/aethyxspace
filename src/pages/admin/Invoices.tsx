import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, Loader2, RefreshCcw, ExternalLink } from "lucide-react";
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
  status: string;
  description: string | null;
  hosted_invoice_url: string | null;
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

  // Create form state
  const [profileId, setProfileId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [daysUntilDue, setDaysUntilDue] = useState("14");

  // Sync form state
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

  const handleCreate = async () => {
    if (!profileId || !description.trim() || !amount) return;
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("create-admin-invoice", {
      body: {
        profileId,
        description: description.trim(),
        amount: Number(amount),
        daysUntilDue: Number(daysUntilDue) || 14,
      },
    });
    setSubmitting(false);
    if (error || !data?.success) {
      toast({ title: "Failed to create invoice", description: data?.error || error?.message, variant: "destructive" });
      return;
    }
    toast({ title: "Invoice created", description: "Client has been notified by email." });
    setCreateOpen(false);
    setDescription(""); setAmount(""); setProfileId("");
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
      toast({ title: "Sync failed", description: data?.error || error?.message, variant: "destructive" });
      return;
    }
    toast({ title: "Synced from Stripe", description: `${data.invoicesUpserted} invoice(s) imported.` });

    if (inviteAfterSync) {
      const inviteRes = await supabase.functions.invoke("provision-client-portal", {
        body: {
          email: syncEmail.trim(),
          firstName: (syncName.trim().split(/\s+/)[0]) || undefined,
          profileId: data.profileId,
        },
      });
      if (inviteRes.error) {
        toast({ title: "Invite email failed", description: inviteRes.error.message, variant: "destructive" });
      } else {
        toast({ title: "Portal invite sent", description: `Invitation emailed to ${syncEmail}.` });
      }
    }
    setSubmitting(false);
    setSyncOpen(false);
    setSyncEmail(""); setSyncName("");
    fetchAll();
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-display tracking-wider flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" /> Invoices
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setSyncOpen(true)}>
            <RefreshCcw className="h-4 w-4 mr-2" /> Sync from Stripe
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Invoice
          </Button>
        </div>
      </div>

      {invoices.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No invoices yet.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => {
            const profile = profiles.find((p) => p.id === inv.client_profile_id);
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
                  <div className="flex items-center gap-3">
                    <span className="font-display text-lg">${Number(inv.amount_due).toFixed(2)}</span>
                    {inv.hosted_invoice_url && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={inv.hosted_invoice_url} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Invoice Dialog */}
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
            <div>
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Phase 1 — Discovery & wireframes" rows={3} maxLength={500} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount (USD)</Label>
                <Input type="number" step="0.01" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="2500.00" />
              </div>
              <div>
                <Label>Due in (days)</Label>
                <Input type="number" min="1" value={daysUntilDue} onChange={(e) => setDaysUntilDue(e.target.value)} />
              </div>
            </div>
            <Button onClick={handleCreate} disabled={submitting || !profileId || !description.trim() || !amount} className="w-full">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create & send invoice
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sync from Stripe Dialog */}
      <Dialog open={syncOpen} onOpenChange={setSyncOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Sync client from Stripe</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Pulls the customer + all invoices from Stripe and creates a client profile.
            </p>
            <div>
              <Label>Email</Label>
              <Input type="email" value={syncEmail} onChange={(e) => setSyncEmail(e.target.value)} placeholder="client@example.com" />
            </div>
            <div>
              <Label>Full name <span className="text-muted-foreground text-xs">(only if creating new in Stripe)</span></Label>
              <Input value={syncName} onChange={(e) => setSyncName(e.target.value)} placeholder="Adam Oppenheimer" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={inviteAfterSync} onChange={(e) => setInviteAfterSync(e.target.checked)} />
              Send portal invite email after sync
            </label>
            <Button onClick={handleSync} disabled={submitting || !syncEmail.trim()} className="w-full">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Sync from Stripe
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Invoices;
