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
import { Users, Plus, Loader2, AlertTriangle, Search, GitMerge, CheckCircle2, Mail } from "lucide-react";

const lightVars = {
  "--background": "0 0% 100%",
  "--foreground": "0 0% 4%",
  "--card": "0 0% 98%",
  "--card-foreground": "0 0% 4%",
  "--popover": "0 0% 100%",
  "--popover-foreground": "0 0% 4%",
  "--muted": "0 0% 96%",
  "--muted-foreground": "0 0% 45%",
  "--input": "0 0% 93%",
  "--border": "0 0% 88%",
  "--secondary": "0 0% 96%",
  "--secondary-foreground": "0 0% 9%",
  "--accent": "0 0% 96%",
  "--accent-foreground": "0 0% 9%",
} as React.CSSProperties;

const ADMIN_PREVIEW_EMAIL = "kmitch2087@gmail.com";

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

  // Merge state
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergePair, setMergePair] = useState<[ClientRow, ClientRow] | null>(null);
  const [primaryId, setPrimaryId] = useState<string>("");
  const [merging, setMerging] = useState(false);
  const [previewingEmails, setPreviewingEmails] = useState(false);

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

  const duplicates = useMemo(() => {
    const emailMap = new Map<string, ClientRow[]>();
    clients.forEach((c) => {
      if (!c.email) return;
      const key = c.email.toLowerCase();
      const existing = emailMap.get(key) || [];
      existing.push(c);
      emailMap.set(key, existing);
    });
    return Array.from(emailMap.values()).filter((group) => group.length > 1);
  }, [clients]);

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

  const openMerge = (group: ClientRow[]) => {
    setMergePair([group[0], group[1]]);
    setPrimaryId(group[0].id);
    setMergeOpen(true);
  };

  const handlePreviewEmails = async () => {
    if (!mergePair) return;
    const primary = mergePair.find((c) => c.id === primaryId) || mergePair[0];
    const fn = primary.full_name?.split(" ")[0] || "there";

    setPreviewingEmails(true);
    const templates = [
      { templateName: "portal-invite", templateData: { firstName: fn, actionLink: "https://aethyx.space/portal" } },
      { templateName: "intake-required", templateData: { recipientName: fn, portalUrl: "https://aethyx.space/portal/intake" } },
      { templateName: "intake-confirmation", templateData: { name: fn } },
      { templateName: "new-documents", templateData: { firstName: fn, portalDocsUrl: "https://aethyx.space/portal/documents" } },
    ];

    await Promise.all(
      templates.map((t) =>
        supabase.functions.invoke("send-transactional-email", {
          body: {
            ...t,
            recipientEmail: ADMIN_PREVIEW_EMAIL,
            idempotencyKey: `preview-${t.templateName}-${Date.now()}-${Math.random()}`,
          },
        })
      )
    );

    setPreviewingEmails(false);
    toast({ title: "Preview emails sent", description: `4 templates sent to ${ADMIN_PREVIEW_EMAIL}` });
  };

  const handleMerge = async () => {
    if (!mergePair || !primaryId) return;
    const secondaryId = mergePair.find((c) => c.id !== primaryId)!.id;

    setMerging(true);
    const { data, error } = await supabase.functions.invoke("merge-client-profiles", {
      body: { primaryId, secondaryId },
    });
    setMerging(false);

    if (error || !data?.success) {
      toast({ title: "Merge failed", description: data?.error || error?.message, variant: "destructive" });
      return;
    }

    toast({ title: "Profiles merged", description: "Duplicate profile removed." });
    setMergeOpen(false);
    setMergePair(null);
    setPrimaryId("");
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

      {duplicates.length > 0 && (
        <Card className="mb-4 border-orange-500/40 bg-orange-500/5">
          <CardContent className="py-3 flex items-start gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-orange-300 mt-0.5 shrink-0">
              <GitMerge className="h-4 w-4" />
              <span className="font-medium">{duplicates.length} duplicate{duplicates.length > 1 ? "s" : ""} found</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {duplicates.map((group) => (
                <Button
                  key={group[0].email}
                  size="sm"
                  variant="outline"
                  className="border-orange-500/40 text-orange-300 hover:bg-orange-500/10 text-xs h-7"
                  onClick={() => openMerge(group)}
                >
                  {group[0].email}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
            const isDupe = duplicates.some((g) => g.some((r) => r.id === c.id));
            return (
              <Link key={c.id} to={`/admin/clients/${c.id}`} className="block">
                <Card className={`hover:border-primary/40 transition-colors ${isDupe ? "border-orange-500/30" : ""}`}>
                  <CardContent className="py-3 flex items-center justify-between gap-4 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-sm">{c.full_name}</span>
                        {c.status !== "active" && <Badge variant="outline" className="text-xs capitalize">{c.status}</Badge>}
                        {agg?.review ? <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/40 text-xs">Needs review</Badge> : null}
                        {isDupe && <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/40 text-xs">Duplicate</Badge>}
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

      {/* Create Client */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md bg-white text-black" style={lightVars}>
          <DialogHeader><DialogTitle className="text-black">New Client</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-black">First name</Label><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="bg-white text-black border-black/20" /></div>
              <div><Label className="text-black">Last name</Label><Input value={lastName} onChange={(e) => setLastName(e.target.value)} className="bg-white text-black border-black/20" /></div>
            </div>
            <div><Label className="text-black">Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-white text-black border-black/20" /></div>
            <div><Label className="text-black">Phone <span className="text-black/40 text-xs">(optional)</span></Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-white text-black border-black/20" /></div>
            <div><Label className="text-black">Business name <span className="text-black/40 text-xs">(optional)</span></Label><Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="bg-white text-black border-black/20" /></div>
            <label className="flex items-center gap-2 text-sm text-black">
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

      {/* Merge Dialog */}
      <Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
        <DialogContent className="sm:max-w-xl bg-white text-black" style={lightVars}>
          <DialogHeader><DialogTitle className="text-black">Merge Duplicate Profiles</DialogTitle></DialogHeader>
          {mergePair && (
            <div className="space-y-4">
              <p className="text-sm text-black/50">
                Both profiles share the same email address. Select which one to keep as the primary — all invoices, documents, and other records will be moved into it and the duplicate will be deleted.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {mergePair.map((c) => {
                  const isPrimary = primaryId === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setPrimaryId(c.id)}
                      className={`p-4 rounded-xl border-2 text-left transition-colors ${isPrimary ? "border-primary bg-primary/5" : "border-black/10 hover:border-black/25"}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-semibold uppercase tracking-wider ${isPrimary ? "text-primary" : "text-black/30"}`}>
                          {isPrimary ? "Keep this one" : "Remove this one"}
                        </span>
                        {isPrimary && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      </div>
                      <p className="font-semibold text-sm text-black">{c.full_name}</p>
                      <p className="text-xs text-black/50 mt-0.5">{c.email}</p>
                      {c.business_name && <p className="text-xs text-black/40 mt-0.5">{c.business_name}</p>}
                      <p className={`text-xs mt-2 ${isPrimary ? "text-black/50" : "text-black/30"}`}>
                        {aggByClient.get(c.id)?.count || 0} invoices · ${(aggByClient.get(c.id)?.total || 0).toFixed(2)}
                      </p>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-black/10">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviewEmails}
                  disabled={previewingEmails || !primaryId}
                  className="border-black/20 text-black hover:bg-black/5"
                >
                  {previewingEmails
                    ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    : <Mail className="h-4 w-4 mr-2" />}
                  Preview client emails
                </Button>
                <p className="text-xs text-black/40 flex-1">Sends 4 templates to {ADMIN_PREVIEW_EMAIL}</p>
                <Button
                  size="sm"
                  onClick={handleMerge}
                  disabled={merging || !primaryId}
                >
                  {merging ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <GitMerge className="h-4 w-4 mr-2" />}
                  Merge profiles
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Clients;
