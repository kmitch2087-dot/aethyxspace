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
  AlertTriangle, CheckCircle2, Trash2, RefreshCcw, FileText, Image, Bell,
} from "lucide-react";
import { format } from "date-fns";

// Applied to all Dialogs (they render in a portal outside the admin light-mode wrapper)
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
interface IntakeRow {
  id: string;
  status: string;
  created_at: string;
  notes: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  business_name: string | null;
  responses: Record<string, { label: string; section: string; value: string }> | null;
}
interface MessageRow { id: string; message: string; created_at: string; }
interface ProjectRow { id: string; name: string; status: string; notes: string | null; created_at: string; }

const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg", "avif"]);

function fileExt(path: string): string {
  return (path.split(".").pop() || "").toLowerCase();
}

const ClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [docUrls, setDocUrls] = useState<Record<string, string>>({});
  const [agreements, setAgreements] = useState<AgreementRow[]>([]);
  const [intakes, setIntakes] = useState<IntakeRow[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);

  // Doc upload
  const [docOpen, setDocOpen] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sendingDocNotif, setSendingDocNotif] = useState(false);

  // Invoice creation
  const [invOpen, setInvOpen] = useState(false);
  const [invDesc, setInvDesc] = useState("");
  const [invAmount, setInvAmount] = useState("");
  const [invDays, setInvDays] = useState("14");

  // Project creation
  const [projOpen, setProjOpen] = useState(false);
  const [projName, setProjName] = useState("");

  const fetchSignedUrls = async (rows: DocRow[]) => {
    if (!rows.length) { setDocUrls({}); return; }
    const { data: signed } = await supabase.storage
      .from("client-documents")
      .createSignedUrls(rows.map((d) => d.file_url), 3600);
    const map: Record<string, string> = {};
    (signed || []).forEach((item) => {
      const doc = rows.find((d) => d.file_url === item.path);
      if (doc && item.signedUrl) map[doc.id] = item.signedUrl;
    });
    setDocUrls(map);
  };

  const fetchAll = async () => {
    if (!id) return;
    const { data: p } = await supabase.from("client_profiles").select("*").eq("id", id).maybeSingle();
    if (!p) { setLoading(false); return; }
    setProfile(p as Profile);

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
    const docRows = (dc.data as DocRow[]) || [];
    setDocs(docRows);
    setAgreements((ag.data as AgreementRow[]) || []);
    setIntakes((it.data as IntakeRow[]) || []);
    setMessages((ms.data as MessageRow[]) || []);
    setProjects((pr.data as ProjectRow[]) || []);
    setLoading(false);
    fetchSignedUrls(docRows);
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

  const handleDeleteDoc = async (doc: DocRow) => {
    await supabase.storage.from("client-documents").remove([doc.file_url]);
    await supabase.from("client_documents").delete().eq("id", doc.id);
    setDocs((s) => s.filter((d) => d.id !== doc.id));
    setDocUrls((s) => { const n = { ...s }; delete n[doc.id]; return n; });
    toast({ title: "Document deleted" });
  };

  const handleNotifyDocs = async () => {
    if (!profile?.email) return;
    setSendingDocNotif(true);
    const { error } = await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "new-documents",
        recipientEmail: profile.email,
        idempotencyKey: `new-docs-${profile.id}-${Date.now()}`,
        templateData: {
          firstName: profile.first_name || "",
          portalDocsUrl: "https://aethyx.space/portal/documents",
        },
      },
    });
    setSendingDocNotif(false);
    if (error) toast({ title: "Email failed", description: error.message, variant: "destructive" });
    else toast({ title: "Notification sent", description: `${profile.email} will get an email to check their documents.` });
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
    await supabase.from("client_projects").insert({ client_profile_id: profile.id, name: projName.trim() });
    setProjOpen(false); setProjName(""); fetchAll();
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
        <TabsContent value="documents" className="mt-4 space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex gap-2">
              {profile.email && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNotifyDocs}
                  disabled={sendingDocNotif || docs.length === 0}
                  title="Email client about new documents"
                >
                  {sendingDocNotif ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Bell className="h-4 w-4 mr-2" />}
                  Notify client
                </Button>
              )}
            </div>
            <Button size="sm" onClick={() => setDocOpen(true)}><Upload className="h-4 w-4 mr-2" /> Upload</Button>
          </div>
          {docs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No documents uploaded.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {docs.map((d) => {
                const ext = fileExt(d.file_url);
                const isImage = IMAGE_EXTS.has(ext);
                const signedUrl = docUrls[d.id];
                return (
                  <div key={d.id} className="group relative border border-black/10 rounded-xl overflow-hidden bg-white hover:shadow-md transition-shadow">
                    <button
                      className="w-full text-left focus:outline-none"
                      onClick={() => signedUrl && window.open(signedUrl, "_blank")}
                      disabled={!signedUrl}
                    >
                      <div className="h-36 bg-black/5 flex items-center justify-center overflow-hidden">
                        {isImage && signedUrl ? (
                          <img src={signedUrl} alt={d.title} className="w-full h-full object-cover" />
                        ) : (
                          <FileText className="h-14 w-14 text-black/20" />
                        )}
                      </div>
                      <div className="p-3">
                        <p className="font-medium text-sm text-black truncate">{d.title}</p>
                        <p className="text-xs text-black/50 mt-0.5">{format(new Date(d.created_at), "MMM d, yyyy")}</p>
                      </div>
                    </button>
                    <button
                      className="absolute top-2 right-2 p-1 rounded-full bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 text-black/40 hover:text-red-600"
                      onClick={(e) => { e.stopPropagation(); handleDeleteDoc(d); }}
                      title="Delete document"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
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
        <TabsContent value="intakes" className="mt-4 space-y-6">
          {intakes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No intake submissions.</p>
          ) : intakes.map((intake) => {
            const grouped: Record<string, Array<{ label: string; value: string }>> = { about: [], project: [], market: [], extra: [] };
            for (const r of Object.values(intake.responses || {})) {
              (grouped[r.section] ||= []).push({ label: r.label, value: r.value });
            }
            const hasResponses = Object.values(grouped).some((g) => g.length > 0);
            return (
              <Card key={intake.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <CardTitle className="text-base font-display">{intake.full_name || profile.full_name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Submitted {format(new Date(intake.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize">{intake.status}</Badge>
                  </div>
                  {(intake.phone || intake.business_name) && (
                    <div className="text-xs text-muted-foreground flex gap-4 mt-1">
                      {intake.phone && <span>{intake.phone}</span>}
                      {intake.business_name && <span>{intake.business_name}</span>}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-5">
                  {!hasResponses && (
                    <p className="text-sm text-muted-foreground italic">No detailed responses recorded.</p>
                  )}
                  {(["about", "project", "market", "extra"] as const).map((section) => {
                    const items = grouped[section] || [];
                    if (!items.length) return null;
                    return (
                      <div key={section}>
                        <h4 className="font-display text-sm tracking-wider text-black/50 uppercase mb-3">
                          {section === "extra" ? "Anything else" : `The ${section}`}
                        </h4>
                        <dl className="space-y-3">
                          {items.map((it, idx) => (
                            <div key={idx} className="border-l-2 border-black/10 pl-4">
                              <dt className="text-xs uppercase tracking-wider text-black/40">{it.label}</dt>
                              <dd className="text-sm text-black/80 whitespace-pre-wrap mt-1">
                                {it.value || <span className="italic text-black/30">— blank —</span>}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    );
                  })}
                  {intake.notes && (
                    <div className="border-t border-black/10 pt-4">
                      <p className="text-xs uppercase tracking-wider text-black/40 mb-1">Notes</p>
                      <p className="text-sm text-black/70">{intake.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
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
        <DialogContent className="sm:max-w-md bg-white text-black" style={lightVars}>
          <DialogHeader><DialogTitle className="text-black">Upload Document</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-black">Title</Label><Input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} className="bg-white text-black border-black/20" /></div>
            <div><Label className="text-black">File</Label><Input type="file" onChange={(e) => setDocFile(e.target.files?.[0] || null)} className="bg-white text-black border-black/20" /></div>
            <Button onClick={handleUploadDoc} disabled={uploading || !docTitle.trim() || !docFile} className="w-full">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />} Upload
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Invoice */}
      <Dialog open={invOpen} onOpenChange={setInvOpen}>
        <DialogContent className="sm:max-w-md bg-white text-black" style={lightVars}>
          <DialogHeader><DialogTitle className="text-black">New Invoice</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-black">Description</Label><Textarea rows={3} value={invDesc} onChange={(e) => setInvDesc(e.target.value)} maxLength={500} className="bg-white text-black border-black/20" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-black">Amount (USD)</Label><Input type="number" step="0.01" min="1" value={invAmount} onChange={(e) => setInvAmount(e.target.value)} className="bg-white text-black border-black/20" /></div>
              <div><Label className="text-black">Due in (days)</Label><Input type="number" min="1" value={invDays} onChange={(e) => setInvDays(e.target.value)} className="bg-white text-black border-black/20" /></div>
            </div>
            <Button onClick={handleCreateInvoice} disabled={saving || !invDesc.trim() || !invAmount} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Create & send
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Project */}
      <Dialog open={projOpen} onOpenChange={setProjOpen}>
        <DialogContent className="sm:max-w-md bg-white text-black" style={lightVars}>
          <DialogHeader><DialogTitle className="text-black">Add Project</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-black">Name</Label><Input value={projName} onChange={(e) => setProjName(e.target.value)} className="bg-white text-black border-black/20" /></div>
            <Button onClick={addProject} disabled={!projName.trim()} className="w-full">Add</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientDetail;
