import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Plus, Loader2, AlertTriangle, Search } from "lucide-react";

interface ClientRow {
  id: string;
  full_name: string;
  email: string | null;
  business_name: string | null;
  status: string;
  stripe_customer_ids: string[] | null;
}

interface InvoiceAgg {
  client_profile_id: string | null;
  amount_due: number;
  needs_review: boolean;
}

const Clients = () => {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [invAgg, setInvAgg] = useState<InvoiceAgg[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [sendInvite, setSendInvite] = useState(true);

  const fetchAll = async () => {
    const [c, i] = await Promise.all([
      supabase.from("client_profiles").select("id, full_name, email, business_name, status, stripe_customer_ids").order("full_name"),
      supabase.from("client_invoices").select("client_profile_id, amount_due, needs_review"),
    ]);
    setClients((c.data as ClientRow[]) || []);
    setInvAgg((i.data as InvoiceAgg[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const aggByClient = useMemo(() => {
    const m = new Map<string, { count: number; total: number; review: number }>();
    invAgg.forEach((r) => {
      if (!r.client_profile_id) return;
      const cur = m.get(r.client_profile_id) || { count: 0, total: 0, review: 0 };
      cur.count += 1;
      cur.total += Number(r.amount_due) || 0;
      if (r.needs_review) cur.review += 1;
      m.set(r.client_profile_id, cur);
    });
    return m;
  }, [invAgg]);

  const totalReview = invAgg.filter((r) => r.needs_review).length;
  const filtered = clients.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.full_name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.business_name?.toLowerCase().includes(q);
  });

  const handleCreate = async () => {
    if (!firstName.trim() || !email.trim()) return;
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("create-client", {
      body: {
        firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(),
        phone: phone.trim() || undefined, businessName: businessName.trim() || undefined,
        sendInvite,
      },
    });
    setSubmitting(false);
    if (error || !data?.success) {
      toast({ title: "Failed to create client", description: data?.error || error?.message, variant: "destructive" });
      return;
    }
    const warnings = (data.warnings || []) as string[];
    toast({
      title: "Client created",
      description: warnings.length ? warnings.join(" · ") : (sendInvite ? "Portal invite sent." : "Profile saved."),
    });
    setCreateOpen(false);
    setFirstName(""); setLastName(""); setEmail(""); setPhone(""); setBusinessName("");
    fetchAll();
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-display tracking-wider flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" /> Clients
        </h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Client
        </Button>
      </div>

      {totalReview > 0 && (
        <Card className="mb-4 border-yellow-500/40 bg-yellow-500/5">
          <CardContent className="py-3 flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            {totalReview} invoice{totalReview > 1 ? "s" : ""} need{totalReview === 1 ? "s" : ""} review.
          </CardContent>
        </Card>
      )}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or business…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">No clients match.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => {
            const agg = aggByClient.get(c.id);
            return (
              <Link key={c.id} to={`/admin/clients/${c.id}`} className="block">
                <Card className="hover:border-primary/40 transition-colors">
                  <CardContent className="py-3 flex items-center justify-between gap-4 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-sm">{c.full_name}</span>
                        {c.status !== "active" && <Badge variant="outline" className="text-xs capitalize">{c.status}</Badge>}
                        {agg?.review ? <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/40 text-xs">Needs review</Badge> : null}
                      </div>
                      <p className="text-xs text-muted-foreground">{c.email || "—"}{c.business_name ? ` · ${c.business_name}` : ""}</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div>{agg?.count || 0} invoice{(agg?.count || 0) === 1 ? "" : "s"}</div>
                      <div className="font-display text-base text-foreground">${(agg?.total || 0).toFixed(2)}</div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New Client</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>First name</Label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div>
                <Label>Last name</Label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label>Phone <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label>Business name <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={sendInvite} onChange={(e) => setSendInvite(e.target.checked)} />
              Create Stripe customer + send portal invite email
            </label>
            <Button onClick={handleCreate} disabled={submitting || !firstName.trim() || !email.trim()} className="w-full">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create client
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Clients;
