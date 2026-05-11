import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Loader2, Save, Upload, Mail, Plus, ExternalLink,
  AlertTriangle, CheckCircle2, Trash2, RefreshCcw,
} from "lucide-react";
import { format } from "date-fns";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  business_name: string | null;
  billing_address: string | null;
  billing_city: string | null;
  billing_state: string | null;
  billing_zip: string | null;
  notes: string | null;
  status: string;
  source: string | null;
  stripe_customer_id: string | null;
  stripe_customer_ids: string[] | null;
}

interface Invoice {
  id: string;
  invoice_number: string | null;
  amount_due: number;
  amount_paid: number;
  status: string;
  description: string | null;
  hosted_invoice_url: string | null;
  created_at: string;
  paid_at: string | null;
  needs_review: boolean;
  review_reason: string | null;
}

interface DocRow { id: string; title: string; file_url: string; created_at: string; }
interface AgreementRow { id: string; service_name: string | null; status: string; amount: number | null; agreement_url: string | null; created_at: string; }
interface IntakeRow { id: string; status: string; created_at: string; notes: string | null; }
interface MessageRow { id: string; message: string; created_at: string; }
interface ProjectRow { id: string; name: string; lovable_url: string | null; status: string; notes: string | null; created_at: string; }

const ClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [agreements, setAgreements] = useState<AgreementRow[]>([]);
  const [intakes, setIntakes] = useState<IntakeRow[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);

  // Doc upload
  const [docOpen, setDocOpen] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Invoice creation
  const [invOpen, setInvOpen] = useState(false);
  const [invDesc, setInvDesc] = useState("");
  const [invAmount, setInvAmount] = useState("");
  const [invDays, setInvDays] = useState("14");

  // Project creation
  const [projOpen, setProjOpen] = useState(false);
  const [projName, setProjName] = useState("");
  const [projUrl, setProjUrl] = useState("");

  const fetchAll = async () => {
    if (!id) return;
    const { data: p } = await supabase.from("client_profiles").select("*").eq("id", id).maybeSingle();
    if (!p) { setLoading(false); return; }
    setProfile(p as Profile);

    // Primary linkage: client_profile_id. Fall back to legacy keys (user_id, email) so older rows still appear.
    const emailLc = p.email ? p.email.toLowerCase() : null;
    const [inv, dc, ag, it, ms, pr] = await Promise.all([
      supabase.from("client_invoices").select("*").eq("client_profile_id", id).order("created_at", { ascending: false }),
      supabase.from("client_documents").select("*").or(`client_profile_id.eq.${id},user_id.eq.${p.user_id}`).order("created_at", { ascending: false }),
      emailLc
        ? supabase.from("client_agreements").select("*").or(`client_profile_id.eq.${id},client_email.eq.${emailLc}`).order("created_at", { ascending: false })
        : supabase.from("client_agreements").select("*").eq("client_profile_id", id).order("created_at", { ascending: false }),
      emailLc
        ? supabase.from("client_intakes").select("*").or(`client_profile_id.eq.${id},email.eq.${emailLc}`).order("created_at", { ascending: false })
        : supabase.from("client_intakes").select("*").eq("client_profile_id", id).order("created_at", { ascending: false }),
      supabase.from("client_messages").select("*").or(`client_profile_id.eq.${id},user_id.eq.${p.user_id}`).order("created_at", { ascending: false }),
      supabase.from("client_projects").select("*").eq("client_profile_id", id).order("created_at", { ascending: false }),
    ]);
    setInvoices((inv.data as Invoice[]) || []);
    setDocs((dc.data as DocRow[]) || []);
    setAgreements((ag.data as AgreementRow[]) || []);
    setIntakes((it.data as IntakeRow[]) || []);
    setMessages((ms.data as MessageRow[]) || []);
    setProjects((pr.data as ProjectRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); /* eslint-disable-next-line */ }, [id]);

  const saveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    const fullName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || profile.full_name;
    const { error } = await supabase.from("client_profiles").update({
      first_name: profile.first_name, last_name: profile.last_name, full_name: fullName,
      email: profile.email?.toLowerCase() || null,
      phone: profile.phone, business_name: profile.business_name,
      billing_address: profile.billing_address, billing_city: profile.billing_city,
      billing_state: profile.billing_state, billing_zip: profile.billing_zip,
      notes: profile.notes, status: profile.status,
      stripe_customer_ids: profile.stripe_customer_ids || [],
    }).eq("id", profile.id);
    setSaving(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: "Saved" });
  };

  const handleResendInvite = async () => {
    if (!profile?.email) return;
    const { error } = await supabase.functions.invoke("provision-client-portal", {
      body: { email: profile.email, firstName: profile.first_name || "", profileId: profile.id },
    });
    if (error) toast({ title: "Invite failed", description: error.message, variant: "destructive" });
    else toast({ title: "Portal invite sent" });
  };

  const handleUploadDoc = async () => {
    if (!profile || !docFile || !docTitle.trim()) return;
    setUploading(true);
    // Store under the stable profile.id folder so it survives auth user re-linking.
    const filePath = `${profile.id}/${Date.now()}_${docFile.name}`;
    const { error: upErr } = await supabase.storage.from("client-documents").upload(filePath, docFile);
    if (upErr) { setUploading(false); toast({ title: "Upload failed", description: upErr.message, variant: "destructive" }); return; }
    const { error: insErr } = await supabase.from("client_documents").insert({
      client_profile_id: profile.id,
      user_id: profile.user_id,
      title: docTitle.trim(),
      file_url: filePath,
      uploaded_by: "admin",
    });
    setUploading(false);
    if (insErr) toast({ title: "Save failed", description: insErr.message, variant: "destructive" });
    else { toast({ title: "Document uploaded" }); setDocOpen(false); setDocTitle(""); setDocFile(null); fetchAll(); }
  };

  const handleCreateInvoice = async () => {
    if (!profile || !invDesc.trim() || !invAmount) return;
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("create-admin-invoice", {
      body: { profileId: profile.id, description: invDesc.trim(), amount: Number(invAmount), daysUntilDue: Number(invDays) || 14 },
    });
    setSaving(false);
    if (error || !data?.success) {
      toast({ title: "Invoice failed", description: data?.error || error?.message, variant: "destructive" });
    } else {
      toast({ title: "Invoice sent" });
      setInvOpen(false); setInvDesc(""); setInvAmount("");
      fetchAll();
    }
  };

  const clearReview = async (invId: string) => {
    await supabase.from("client_invoices").update({ needs_review: false, review_reason: null }).eq("id", invId);
    fetchAll();
  };

  const addProject = async () => {
    if (!profile || !projName.trim()) return;
    await supabase.from("client_projects").insert({
      client_profile_id: profile.id,
      name: projName.trim(),
      lovable_url: projUrl.trim() || null,
    });
    setProjOpen(false); setProjName(""); setProjUrl(""); fetchAll();
  };

  const deleteProject = async (pid: string) => {
    await supabase.from("client_projects").delete().eq("id", pid);
    fetchAll();
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!profile) return (
    <div className="py-12 text-center">
      <p className="text-muted-foreground mb-4">Client not found.</p>
      <Button asChild variant="outline"><Link to="/admin/clients"><ArrowLeft className="h-4 w-4 mr-2" /> Back</Link></Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-3">
            <Link to="/admin/clients"><ArrowLeft className="h-4 w-4 mr-1" /> Clients</Link>
          </Button>
          <h1 className="text-2xl font-display tracking-wider">{profile.full_name}</h1>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {profile.email && (
            <Button variant="outline" size="sm" onClick={handleResendInvite}>
              <Mail className="h-4 w-4 mr-2" /> Resend invite
            </Button>
          )}
          <Button size="sm" onClick={saveProfile} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save
          </Button>
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({docs.length})</TabsTrigger>
          <TabsTrigger value="projects">Projects ({projects.length})</TabsTrigger>
          <TabsTrigger value="agreements">Agreements ({agreements.length})</TabsTrigger>
          <TabsTrigger value="intakes">Intakes ({intakes.length})</TabsTrigger>
          <TabsTrigger value="messages">Messages ({messages.length})</TabsTrigger>
        </TabsList>

        {/* PROFILE */}
        <TabsContent value="profile" className="mt-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>First name</Label><Input value={profile.first_name || ""} onChange={(e) => setProfile({ ...profile, first_name: e.target.value })} /></div>
                <div><Label>Last name</Label><Input value={profile.last_name || ""} onChange={(e) => setProfile({ ...profile, last_name: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Email</Label><Input type="email" value={profile.email || ""} onChange={(e) => setProfile({ ...profile, email: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={profile.phone || ""} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></div>
              </div>
              <div><Label>Business name</Label><Input value={profile.business_name || ""} onChange={(e) => setProfile({ ...profile, business_name: e.target.value })} /></div>
              <div><Label>Billing address</Label><Input value={profile.billing_address || ""} onChange={(e) => setProfile({ ...profile, billing_address: e.target.value })} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>City</Label><Input value={profile.billing_city || ""} onChange={(e) => setProfile({ ...profile, billing_city: e.target.value })} /></div>
                <div><Label>State</Label><Input value={profile.billing_state || ""} onChange={(e) => setProfile({ ...profile, billing_state: e.target.value })} /></div>
                <div><Label>Zip</Label><Input value={profile.billing_zip || ""} onChange={(e) => setProfile({ ...profile, billing_zip: e.target.value })} /></div>
              </div>
              <div><Label>Internal notes</Label><Textarea rows={4} value={profile.notes || ""} onChange={(e) => setProfile({ ...profile, notes: e.target.value })} /></div>
              <div>
                <Label>Linked Stripe customer IDs</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {(profile.stripe_customer_ids || []).map((cid) => (
                    <Badge key={cid} variant="outline" className="font-mono text-xs">
                      {cid}
                      <button
                        className="ml-2 opacity-60 hover:opacity-100"
                        onClick={() => setProfile({ ...profile, stripe_customer_ids: (profile.stripe_customer_ids || []).filter((x) => x !== cid) })}
                      >×</button>
                    </Badge>
                  ))}
                  {!(profile.stripe_customer_ids || []).length && <span className="text-xs text-muted-foreground">None linked</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-2">Source: {profile.source || "—"}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* INVOICES */}
        <TabsContent value="invoices" className="mt-4 space-y-2">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setInvOpen(true)}><Plus className="h-4 w-4 mr-2" /> New invoice</Button>
          </div>
          {invoices.length === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">No invoices yet.</p> : invoices.map((inv) => (
            <Card key={inv.id} className={inv.needs_review ? "border-yellow-500/40 bg-yellow-500/5" : ""}>
              <CardContent className="pt-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium text-sm">{inv.invoice_number || "—"}</span>
                    <Badge variant={inv.status === "paid" ? "default" : "secondary"} className="capitalize text-xs">{inv.status}</Badge>
                    {inv.needs_review && (
                      <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/40 text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" /> Needs review
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{inv.description || "No description"}</p>
                  {inv.review_reason && <p className="text-xs text-yellow-400/80 mt-1">{inv.review_reason}</p>}
                  <p className="text-xs text-muted-foreground/70 mt-1">{format(new Date(inv.created_at), "MMM d, yyyy")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-lg">${Number(inv.amount_due).toFixed(2)}</span>
                  {inv.needs_review && (
                    <Button size="sm" variant="ghost" onClick={() => clearReview(inv.id)} title="Confirm and clear flag">
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  )}
                  {inv.hosted_invoice_url && (
                    <Button variant="ghost" size="sm" asChild>
                      <a href={inv.hosted_invoice_url} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3" /></a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* DOCUMENTS */}
        <TabsContent value="documents" className="mt-4 space-y-2">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setDocOpen(true)}><Upload className="h-4 w-4 mr-2" /> Upload</Button>
          </div>
          {docs.length === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">No documents uploaded.</p> : docs.map((d) => (
            <Card key={d.id}><CardContent className="pt-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-sm">{d.title}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(d.created_at), "MMM d, yyyy")}</p>
              </div>
            </CardContent></Card>
          ))}
        </TabsContent>

        {/* PROJECTS */}
        <TabsContent value="projects" className="mt-4 space-y-2">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setProjOpen(true)}><Plus className="h-4 w-4 mr-2" /> Add project</Button>
          </div>
          {projects.length === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">No projects yet.</p> : projects.map((p) => (
            <Card key={p.id}><CardContent className="pt-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm">{p.name}</p>
                {p.lovable_url && <a href={p.lovable_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline break-all">{p.lovable_url}</a>}
              </div>
              <Button size="sm" variant="ghost" onClick={() => deleteProject(p.id)}><Trash2 className="h-4 w-4" /></Button>
            </CardContent></Card>
          ))}
        </TabsContent>

        {/* AGREEMENTS */}
        <TabsContent value="agreements" className="mt-4 space-y-2">
          {agreements.length === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">No agreements.</p> : agreements.map((a) => (
            <Card key={a.id}><CardContent className="pt-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{a.service_name || "Agreement"}</p>
                <p className="text-xs text-muted-foreground">{a.status} · {format(new Date(a.created_at), "MMM d, yyyy")}</p>
              </div>
              {a.amount && <span className="font-display">${Number(a.amount).toFixed(2)}</span>}
            </CardContent></Card>
          ))}
        </TabsContent>

        {/* INTAKES */}
        <TabsContent value="intakes" className="mt-4 space-y-2">
          {intakes.length === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">No intake submissions.</p> : intakes.map((i) => (
            <Card key={i.id}><CardContent className="pt-4">
              <p className="text-sm">{format(new Date(i.created_at), "MMM d, yyyy")} · <Badge variant="outline" className="text-xs capitalize">{i.status}</Badge></p>
              {i.notes && <p className="text-xs text-muted-foreground mt-1">{i.notes}</p>}
            </CardContent></Card>
          ))}
        </TabsContent>

        {/* MESSAGES */}
        <TabsContent value="messages" className="mt-4 space-y-2">
          {messages.length === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">No messages.</p> : messages.map((m) => (
            <Card key={m.id}><CardContent className="pt-4">
              <p className="text-sm whitespace-pre-wrap">{m.message}</p>
              <p className="text-xs text-muted-foreground mt-1">{format(new Date(m.created_at), "MMM d, yyyy h:mm a")}</p>
            </CardContent></Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Upload Document */}
      <Dialog open={docOpen} onOpenChange={setDocOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} /></div>
            <div><Label>File</Label><Input type="file" onChange={(e) => setDocFile(e.target.files?.[0] || null)} /></div>
            <Button onClick={handleUploadDoc} disabled={uploading || !docTitle.trim() || !docFile} className="w-full">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />} Upload
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Invoice */}
      <Dialog open={invOpen} onOpenChange={setInvOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New Invoice</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Description</Label><Textarea rows={3} value={invDesc} onChange={(e) => setInvDesc(e.target.value)} maxLength={500} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Amount (USD)</Label><Input type="number" step="0.01" min="1" value={invAmount} onChange={(e) => setInvAmount(e.target.value)} /></div>
              <div><Label>Due in (days)</Label><Input type="number" min="1" value={invDays} onChange={(e) => setInvDays(e.target.value)} /></div>
            </div>
            <Button onClick={handleCreateInvoice} disabled={saving || !invDesc.trim() || !invAmount} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Create & send
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Project */}
      <Dialog open={projOpen} onOpenChange={setProjOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Project</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={projName} onChange={(e) => setProjName(e.target.value)} /></div>
            <div><Label>Lovable URL</Label><Input value={projUrl} onChange={(e) => setProjUrl(e.target.value)} placeholder="https://…lovable.app" /></div>
            <Button onClick={addProject} disabled={!projName.trim()} className="w-full">Add</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientDetail;
