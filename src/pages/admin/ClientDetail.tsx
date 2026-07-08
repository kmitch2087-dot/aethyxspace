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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Loader2, Save, Upload, Mail, Plus, ExternalLink,
  AlertTriangle, CheckCircle2, Trash2, RefreshCcw, FileText, Bell, Pencil, XCircle,
  ChevronDown, ChevronUp, Download, ArrowUp, ArrowDown,
  Eye, EyeOff, Clock, ListTodo,
} from "lucide-react";
import { format } from "date-fns";

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

interface DocumentSlot {
  id: string;
  client_profile_id: string;
  slot_type: 'site_audit' | 'market_research' | 'service_tier' | 'plan' | 'agreement';
  status: 'pending' | 'in_progress' | 'uploaded' | 'na';
  storage_path?: string;
  file_name?: string;
  file_size?: number;
  uploaded_at?: string;
}

interface CatalogItemSlim {
  id: string;
  name: string;
  type: string;
  category: string;
  price_min: number | null;
  display_price: string | null;
}

interface AddOnRow {
  id: string;
  client_profile_id: string;
  add_on_catalog_id: string | null;
  custom_name: string | null;
  price: number;
  status: string;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  catalog: {
    name: string;
    type: string;
    category: string;
    display_price: string | null;
  } | null;
}

type AssetCategory = "brand_voice" | "tagline" | "motto" | "mission" | "values" | "logo" | "guideline" | "font" | "other";

interface ClientAsset {
  id: string;
  type: "text" | "file";
  category: AssetCategory;
  label: string;
  content?: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  sort_order: number;
  created_at: string;
}

interface ProjectPlan {
  id: string;
  client_profile_id: string;
  project_name: string;
  overview?: string | null;
  completion_percent: number;
  status: "planning" | "active" | "review" | "complete" | "paused";
  start_date?: string | null;
  target_date?: string | null;
  github_url?: string | null;
  created_at: string;
  updated_at: string;
}

interface ProjectPhase {
  id: string;
  plan_id: string;
  name: string;
  description?: string | null;
  completion_percent: number;
  status: "pending" | "in_progress" | "complete";
  sort_order: number;
}

interface ProjectUpdate {
  id: string;
  plan_id: string;
  content: string;
  author: string;
  created_at: string;
  is_client_visible: boolean;
}

interface ProjectTask {
  id: string;
  plan_id: string;
  title: string;
  description?: string;
  assigned_to: "client" | "aethyx";
  status: "pending" | "in_progress" | "complete";
  due_date?: string;
  priority: "low" | "normal" | "high";
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const SLOT_TYPES = ['site_audit', 'market_research', 'service_tier', 'plan', 'agreement'];

const SLOT_LABELS: Record<string, string> = {
  site_audit: 'Site Audit',
  market_research: 'Market Research',
  service_tier: 'Service Tier Information',
  plan: 'Project Plan',
  agreement: 'Agreement',
};

const SLOT_PHASE_NAMES: Record<string, string> = {
  site_audit: 'Site Audit',
  market_research: 'Market Research',
  service_tier: 'Service Tier',
  plan: 'Project Planning',
  agreement: 'Contract & Agreement',
};

const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg", "avif"]);

function fileExt(path: string): string {
  return (path.split(".").pop() || "").toLowerCase();
}

function formatAddonPrice(price: number, type: string): string {
  const rounded = Number(price) % 1 === 0 ? Number(price).toFixed(0) : Number(price).toFixed(2);
  return type === "recurring" ? `$${rounded} / mo` : `$${rounded}`;
}

function assetCategoryInfo(category: AssetCategory): { classes: string; label: string } {
  const map: Record<AssetCategory, { classes: string; label: string }> = {
    brand_voice: { classes: "bg-teal-100 text-teal-700 border-teal-200", label: "Brand Voice" },
    tagline: { classes: "bg-purple-100 text-purple-700 border-purple-200", label: "Tagline" },
    motto: { classes: "bg-blue-100 text-blue-700 border-blue-200", label: "Motto" },
    mission: { classes: "bg-green-100 text-green-700 border-green-200", label: "Mission" },
    values: { classes: "bg-orange-100 text-orange-700 border-orange-200", label: "Values" },
    logo: { classes: "bg-teal-100 text-teal-700 border-teal-200", label: "Logo" },
    guideline: { classes: "bg-blue-100 text-blue-700 border-blue-200", label: "Guidelines" },
    font: { classes: "bg-gray-100 text-gray-600 border-gray-200", label: "Font" },
    other: { classes: "bg-gray-100 text-gray-600 border-gray-200", label: "Other" },
  };
  return map[category] ?? map.other;
}

function planStatusInfo(status: ProjectPlan["status"]): { classes: string; label: string } {
  const map: Record<ProjectPlan["status"], { classes: string; label: string }> = {
    planning: { classes: "bg-gray-100 text-gray-600 border-gray-200", label: "Planning" },
    active: { classes: "bg-teal-100 text-teal-700 border-teal-200", label: "Active" },
    review: { classes: "bg-purple-100 text-purple-700 border-purple-200", label: "In Review" },
    complete: { classes: "bg-green-100 text-green-700 border-green-200", label: "Complete" },
    paused: { classes: "bg-yellow-100 text-yellow-700 border-yellow-200", label: "Paused" },
  };
  return map[status] ?? map.planning;
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

  // Add-ons
  const [addOns, setAddOns] = useState<AddOnRow[]>([]);
  const [catalog, setCatalog] = useState<CatalogItemSlim[]>([]);

  // Doc upload
  const [docOpen, setDocOpen] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sendingDocNotif, setSendingDocNotif] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editingDocTitle, setEditingDocTitle] = useState("");

  // Intake collapsible inside Documents tab
  const [intakesOpen, setIntakesOpen] = useState(false);

  // Invoice creation
  const [invOpen, setInvOpen] = useState(false);
  const [invDesc, setInvDesc] = useState("");
  const [invAmount, setInvAmount] = useState("");
  const [invDays, setInvDays] = useState("14");

  // Project creation
  const [projOpen, setProjOpen] = useState(false);
  const [projName, setProjName] = useState("");

  // Assign add-on dialog
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignCatalogId, setAssignCatalogId] = useState("");
  const [assignCustomName, setAssignCustomName] = useState("");
  const [assignPrice, setAssignPrice] = useState("");
  const [assignStartDate, setAssignStartDate] = useState("");
  const [assignNotes, setAssignNotes] = useState("");
  const [assignSaving, setAssignSaving] = useState(false);

  // Edit add-on dialog
  const [editAddOn, setEditAddOn] = useState<AddOnRow | null>(null);
  const [editAddOnStatus, setEditAddOnStatus] = useState("");
  const [editAddOnPrice, setEditAddOnPrice] = useState("");
  const [editAddOnNotes, setEditAddOnNotes] = useState("");
  const [editAddOnEndDate, setEditAddOnEndDate] = useState("");
  const [editAddOnSaving, setEditAddOnSaving] = useState(false);

  // Notes expand/collapse
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  // Assets
  const [assets, setAssets] = useState<ClientAsset[]>([]);
  const [assetSignedUrls, setAssetSignedUrls] = useState<Record<string, string>>({});
  const [addTextAssetOpen, setAddTextAssetOpen] = useState(false);
  const [addFileAssetOpen, setAddFileAssetOpen] = useState(false);
  const [textAssetCategory, setTextAssetCategory] = useState<AssetCategory>("brand_voice");
  const [textAssetLabel, setTextAssetLabel] = useState("");
  const [textAssetContent, setTextAssetContent] = useState("");
  const [textAssetSaving, setTextAssetSaving] = useState(false);
  const [fileAssetCategory, setFileAssetCategory] = useState<AssetCategory>("logo");
  const [fileAssetLabel, setFileAssetLabel] = useState("");
  const [fileAssetFile, setFileAssetFile] = useState<File | null>(null);
  const [fileAssetUploading, setFileAssetUploading] = useState(false);

  // Plan
  const [plan, setPlan] = useState<ProjectPlan | null>(null);
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [planUpdates, setPlanUpdates] = useState<ProjectUpdate[]>([]);
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [showCreatePlanDialog, setShowCreatePlanDialog] = useState(false);
  const [newPlanName, setNewPlanName] = useState("Website Project");
  const [newPlanStatus, setNewPlanStatus] = useState<"planning" | "active">("planning");
  const [newPlanStart, setNewPlanStart] = useState("");
  const [newPlanEnd, setNewPlanEnd] = useState("");
  const [newPlanOverview, setNewPlanOverview] = useState("");
  const [newPlanGithub, setNewPlanGithub] = useState("");
  const [newUpdateContent, setNewUpdateContent] = useState("");
  const [newUpdateSaving, setNewUpdateSaving] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState("");
  const [addingPhase, setAddingPhase] = useState(false);
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
  const [editingPhaseName, setEditingPhaseName] = useState("");
  const [editingPlanName, setEditingPlanName] = useState(false);
  const [editingPlanNameValue, setEditingPlanNameValue] = useState("");

  // Tasks
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskAssignedTo, setNewTaskAssignedTo] = useState<"client" | "aethyx">("client");
  const [newTaskPriority, setNewTaskPriority] = useState<"low" | "normal" | "high">("normal");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [showTaskDescription, setShowTaskDescription] = useState(false);
  const [addingTask, setAddingTask] = useState(false);

  // Document slots
  const [docSlots, setDocSlots] = useState<DocumentSlot[]>([]);
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null);
  const [slotSignedUrls, setSlotSignedUrls] = useState<Record<string, string>>({});
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [agreementDialogOpen, setAgreementDialogOpen] = useState(false);

  // Logo upload
  const [logoUploading, setLogoUploading] = useState(false);

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

  const fetchAssetSignedUrls = async (fileAssets: ClientAsset[]) => {
    if (!fileAssets.length) return;
    const map: Record<string, string> = {};
    for (const asset of fileAssets) {
      if (asset.file_name) {
        const { data: urlData } = await supabase.storage
          .from("client-assets")
          .createSignedUrl(asset.file_name, 60 * 60 * 24 * 7);
        if (urlData?.signedUrl) map[asset.id] = urlData.signedUrl;
      }
    }
    setAssetSignedUrls(map);
  };

  const fetchAll = async () => {
    if (!id) return;
    const { data: p } = await supabase.from("client_profiles").select("*").eq("id", id).maybeSingle();
    if (!p) { setLoading(false); return; }
    setProfile(p as Profile);

    const emailLc = p.email ? p.email.toLowerCase() : null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [inv, dc, ag, it, ms, pr, ao, as_] = await Promise.all([
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from("client_add_ons").select("*, catalog:add_on_catalog_id(name, type, category, display_price)").eq("client_profile_id", id).order("created_at", { ascending: false }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from("client_assets").select("*").eq("client_profile_id", id).order("sort_order"),
    ]);
    setInvoices((inv.data as Invoice[]) || []);
    const docRows = (dc.data as DocRow[]) || [];
    setDocs(docRows);
    setAgreements((ag.data as AgreementRow[]) || []);
    setIntakes((it.data as IntakeRow[]) || []);
    setMessages((ms.data as MessageRow[]) || []);
    setProjects((pr.data as ProjectRow[]) || []);
    setAddOns((ao.data as AddOnRow[]) || []);
    const assetRows = (as_.data as ClientAsset[]) || [];
    setAssets(assetRows);
    setLoading(false);
    fetchSignedUrls(docRows);
    fetchAssetSignedUrls(assetRows.filter((a) => a.type === "file"));
  };

  const fetchPlan = async () => {
    if (!id) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: planData } = await (supabase as any)
      .from("client_project_plans")
      .select("*")
      .eq("client_profile_id", id)
      .maybeSingle();
    setPlan(planData as ProjectPlan | null);
    if (planData) {
      const [{ data: phasesData }, { data: updatesData }, { data: tasksData }] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("client_project_phases").select("*").eq("plan_id", planData.id).order("sort_order"),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("client_project_updates").select("*").eq("plan_id", planData.id).order("created_at", { ascending: false }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("client_project_tasks").select("*").eq("plan_id", planData.id).order("sort_order"),
      ]);
      setPhases((phasesData as ProjectPhase[]) || []);
      setPlanUpdates((updatesData as ProjectUpdate[]) || []);
      setTasks((tasksData as ProjectTask[]) || []);
    } else {
      setPhases([]);
      setPlanUpdates([]);
      setTasks([]);
    }
  };

  const fetchCatalog = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from("add_on_catalog")
      .select("id, name, type, category, price_min, display_price")
      .eq("active", true)
      .order("sort_order");
    setCatalog((data as CatalogItemSlim[]) || []);
  };

  useEffect(() => { fetchAll(); fetchPlan(); /* eslint-disable-next-line */ }, [id]);
  useEffect(() => { fetchCatalog(); }, []);

  useEffect(() => {
    if (!id) return;
    const initSlots = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('client_document_slots').upsert(
        SLOT_TYPES.map((t) => ({ client_profile_id: id, slot_type: t })),
        { onConflict: 'client_profile_id,slot_type', ignoreDuplicates: true },
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [{ data: slotsData }, { data: agreementRec }] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from('client_document_slots').select('*').eq('client_profile_id', id),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from('client_agreement_records').select('id, is_locked, submitted_at').eq('client_profile_id', id).maybeSingle(),
      ]);
      let slots: DocumentSlot[] = slotsData || [];
      if (agreementRec?.submitted_at) {
        slots = slots.map((s) => s.slot_type === 'agreement' ? { ...s, status: 'uploaded' as const } : s);
      }
      setDocSlots(slots);
    };
    initSlots();
    /* eslint-disable-next-line */
  }, [id]);

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

  const saveDocTitle = async (doc: DocRow) => {
    const trimmed = editingDocTitle.trim();
    setEditingDocId(null);
    if (!trimmed || trimmed === doc.title) return;
    await supabase.from("client_documents").update({ title: trimmed }).eq("id", doc.id);
    setDocs((s) => s.map((d) => d.id === doc.id ? { ...d, title: trimmed } : d));
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

  const openAssignDialog = () => {
    setAssignCatalogId("");
    setAssignCustomName("");
    setAssignPrice("");
    setAssignStartDate(format(new Date(), "yyyy-MM-dd"));
    setAssignNotes("");
    setAssignOpen(true);
  };

  const assignAddOn = async () => {
    if (!profile || !assignCatalogId || !assignPrice) return;
    setAssignSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("client_add_ons").insert({
      client_profile_id: profile.id,
      add_on_catalog_id: assignCatalogId,
      custom_name: assignCustomName.trim() || null,
      price: parseFloat(assignPrice),
      status: "active",
      start_date: assignStartDate || null,
      notes: assignNotes.trim() || null,
    });
    setAssignSaving(false);
    if (error) {
      toast({ title: "Failed to assign", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Add-on assigned" });
      setAssignOpen(false);
      fetchAll();
    }
  };

  const openEditAddOn = (addon: AddOnRow) => {
    setEditAddOn(addon);
    setEditAddOnStatus(addon.status);
    setEditAddOnPrice(String(addon.price));
    setEditAddOnNotes(addon.notes || "");
    setEditAddOnEndDate(addon.end_date || "");
  };

  const saveEditAddOn = async () => {
    if (!editAddOn) return;
    setEditAddOnSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("client_add_ons").update({
      status: editAddOnStatus,
      price: parseFloat(editAddOnPrice),
      notes: editAddOnNotes.trim() || null,
      end_date: editAddOnEndDate || null,
      updated_at: new Date().toISOString(),
    }).eq("id", editAddOn.id);
    setEditAddOnSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Add-on updated" });
      setEditAddOn(null);
      fetchAll();
    }
  };

  const removeAddOn = async (addon: AddOnRow) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("client_add_ons").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", addon.id);
    setAddOns((prev) => prev.map((a) => a.id === addon.id ? { ...a, status: "cancelled" } : a));
    toast({ title: "Add-on cancelled" });
  };

  const toggleNote = (addonId: string) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(addonId)) next.delete(addonId);
      else next.add(addonId);
      return next;
    });
  };

  // Asset handlers
  const addTextAsset = async () => {
    if (!profile || !textAssetLabel.trim() || !textAssetContent.trim()) return;
    setTextAssetSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("client_assets").insert({
      client_profile_id: profile.id,
      type: "text",
      category: textAssetCategory,
      label: textAssetLabel.trim(),
      content: textAssetContent.trim(),
      sort_order: assets.filter((a) => a.type === "text").length,
    });
    setTextAssetSaving(false);
    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Asset added" });
      setAddTextAssetOpen(false);
      setTextAssetLabel("");
      setTextAssetContent("");
      setTextAssetCategory("brand_voice");
      fetchAll();
    }
  };

  const uploadFileAsset = async () => {
    if (!profile || !fileAssetFile || !fileAssetLabel.trim()) return;
    setFileAssetUploading(true);
    const storagePath = `${profile.id}/${Date.now()}_${fileAssetFile.name}`;
    const { error: upErr } = await supabase.storage.from("client-assets").upload(storagePath, fileAssetFile);
    if (upErr) {
      setFileAssetUploading(false);
      toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
      return;
    }
    const { data: urlData } = await supabase.storage
      .from("client-assets")
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insErr } = await (supabase as any).from("client_assets").insert({
      client_profile_id: profile.id,
      type: "file",
      category: fileAssetCategory,
      label: fileAssetLabel.trim(),
      file_name: storagePath,
      file_url: urlData?.signedUrl || "",
      file_size: fileAssetFile.size,
      sort_order: assets.filter((a) => a.type === "file").length,
    });
    setFileAssetUploading(false);
    if (insErr) {
      toast({ title: "Save failed", description: insErr.message, variant: "destructive" });
    } else {
      toast({ title: "File uploaded" });
      setAddFileAssetOpen(false);
      setFileAssetLabel("");
      setFileAssetFile(null);
      setFileAssetCategory("logo");
      fetchAll();
    }
  };

  const deleteAsset = async (asset: ClientAsset) => {
    if (asset.type === "file" && asset.file_name) {
      await supabase.storage.from("client-assets").remove([asset.file_name]);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("client_assets").delete().eq("id", asset.id);
    setAssets((prev) => prev.filter((a) => a.id !== asset.id));
    toast({ title: "Asset deleted" });
  };

  // Plan handlers
  const createPlan = async () => {
    if (!profile) return;
    setCreatingPlan(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("client_project_plans").insert({
      client_profile_id: profile.id,
      project_name: newPlanName.trim() || "Website Project",
      status: newPlanStatus,
      completion_percent: 0,
      ...(newPlanStart ? { start_date: newPlanStart } : {}),
      ...(newPlanEnd ? { target_date: newPlanEnd } : {}),
      ...(newPlanOverview.trim() ? { overview: newPlanOverview.trim() } : {}),
      ...(newPlanGithub.trim() ? { github_url: newPlanGithub.trim() } : {}),
    });
    setCreatingPlan(false);
    if (error) {
      toast({ title: "Failed to create plan", description: error.message, variant: "destructive" });
    } else {
      setShowCreatePlanDialog(false);
      setNewPlanName("Website Project");
      setNewPlanStatus("planning");
      setNewPlanStart("");
      setNewPlanEnd("");
      setNewPlanOverview("");
      setNewPlanGithub("");
      fetchPlan();
    }
  };

  const savePlan = async (updates: Partial<ProjectPlan>) => {
    if (!plan) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("client_project_plans")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", plan.id);
    if (!error) {
      setPlan((prev) => prev ? { ...prev, ...updates } : null);
    }
  };

  const recalcPlanCompletion = async (updatedPhases: ProjectPhase[]) => {
    if (!plan) return;
    const avg = updatedPhases.length
      ? Math.round(updatedPhases.reduce((sum, p) => sum + p.completion_percent, 0) / updatedPhases.length)
      : 0;
    await savePlan({ completion_percent: avg });
  };

  const updatePhase = async (phaseId: string, updates: Partial<ProjectPhase>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("client_project_phases").update(updates).eq("id", phaseId);
    const newPhases = phases.map((p) => p.id === phaseId ? { ...p, ...updates } : p);
    setPhases(newPhases);
    if ("completion_percent" in updates) {
      await recalcPlanCompletion(newPhases);
    }
  };

  const deletePhase = async (phaseId: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("client_project_phases").delete().eq("id", phaseId);
    const newPhases = phases.filter((p) => p.id !== phaseId);
    setPhases(newPhases);
    await recalcPlanCompletion(newPhases);
  };

  const movePhase = async (phaseId: string, direction: "up" | "down") => {
    const idx = phases.findIndex((p) => p.id === phaseId);
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === phases.length - 1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const current = phases[idx];
    const swap = phases[swapIdx];
    await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from("client_project_phases").update({ sort_order: swap.sort_order }).eq("id", current.id),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from("client_project_phases").update({ sort_order: current.sort_order }).eq("id", swap.id),
    ]);
    const newPhases = [...phases];
    newPhases[idx] = { ...current, sort_order: swap.sort_order };
    newPhases[swapIdx] = { ...swap, sort_order: current.sort_order };
    newPhases.sort((a, b) => a.sort_order - b.sort_order);
    setPhases(newPhases);
  };

  const saveEditedPhaseName = async (phase: ProjectPhase) => {
    const trimmed = editingPhaseName.trim();
    setEditingPhaseId(null);
    if (!trimmed || trimmed === phase.name) return;
    await updatePhase(phase.id, { name: trimmed });
  };

  const addPhase = async () => {
    if (!plan || !newPhaseName.trim()) return;
    setAddingPhase(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("client_project_phases")
      .insert({
        plan_id: plan.id,
        name: newPhaseName.trim(),
        status: "pending",
        completion_percent: 0,
        sort_order: phases.length,
      })
      .select()
      .single();
    setAddingPhase(false);
    if (error) {
      toast({ title: "Failed to add phase", description: error.message, variant: "destructive" });
    } else {
      setPhases((prev) => [...prev, data as ProjectPhase]);
      setNewPhaseName("");
    }
  };

  const addUpdate = async () => {
    if (!plan || !newUpdateContent.trim()) return;
    setNewUpdateSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("client_project_updates")
      .insert({
        plan_id: plan.id,
        content: newUpdateContent.trim(),
        author: "Kristin",
        is_client_visible: false,
      })
      .select()
      .single();
    setNewUpdateSaving(false);
    if (error) {
      toast({ title: "Failed to post update", description: error.message, variant: "destructive" });
    } else {
      setPlanUpdates((prev) => [data as ProjectUpdate, ...prev]);
      setNewUpdateContent("");
    }
  };

  const toggleUpdateVisibility = async (updateId: string, val: boolean) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("client_project_updates").update({ is_client_visible: val }).eq("id", updateId);
    setPlanUpdates((prev) => prev.map((u) => u.id === updateId ? { ...u, is_client_visible: val } : u));
  };

  const addTask = async () => {
    if (!plan || !newTaskTitle.trim()) return;
    setAddingTask(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("client_project_tasks")
      .insert({
        plan_id: plan.id,
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim() || null,
        assigned_to: newTaskAssignedTo,
        status: "pending",
        priority: newTaskPriority,
        due_date: newTaskDueDate || null,
        sort_order: tasks.length,
      })
      .select()
      .single();
    setAddingTask(false);
    if (error) {
      toast({ title: "Failed to add task", description: error.message, variant: "destructive" });
    } else {
      setTasks((prev) => [...prev, data as ProjectTask]);
      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskDueDate("");
      setShowTaskDescription(false);
      setNewTaskPriority("normal");
      setNewTaskAssignedTo("client");
    }
  };

  const updateTaskStatus = async (taskId: string, status: ProjectTask["status"]) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("client_project_tasks").update({ status, updated_at: new Date().toISOString() }).eq("id", taskId);
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status } : t));
  };

  const deleteTask = async (taskId: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("client_project_tasks").delete().eq("id", taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    toast({ title: "Task deleted" });
  };

  const updateProjectPhaseForSlot = async (slotType: string) => {
    if (!id) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: planData } = await (supabase as any).from('client_project_plans')
      .select('id').eq('client_profile_id', id).maybeSingle();
    if (!planData) return;
    const phaseName = SLOT_PHASE_NAMES[slotType];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase as any).from('client_project_phases')
      .select('id').eq('plan_id', planData.id).ilike('name', phaseName).maybeSingle();
    if (existing) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('client_project_phases')
        .update({ completion_percent: 100, status: 'complete', updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: phaseCount } = await (supabase as any).from('client_project_phases')
        .select('id').eq('plan_id', planData.id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('client_project_phases').insert({
        plan_id: planData.id, name: phaseName, completion_percent: 100,
        status: 'complete', sort_order: (phaseCount?.length || 0),
      });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: allPhases } = await (supabase as any).from('client_project_phases')
      .select('completion_percent').eq('plan_id', planData.id);
    if (allPhases?.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const avg = Math.round(allPhases.reduce((s: number, p: any) => s + p.completion_percent, 0) / allPhases.length);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('client_project_plans')
        .update({ completion_percent: avg, updated_at: new Date().toISOString() }).eq('id', planData.id);
    }
  };

  const handleSlotUpload = async (slotType: string, file: File) => {
    if (!id) return;
    setUploadingSlot(slotType);
    try {
      const path = `${id}/${slotType}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('client-slot-docs').upload(path, file);
      if (uploadError) throw uploadError;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('client_document_slots').upsert({
        client_profile_id: id,
        slot_type: slotType,
        status: 'uploaded',
        storage_path: path,
        file_name: file.name,
        file_size: file.size,
        uploaded_at: new Date().toISOString(),
      }, { onConflict: 'client_profile_id,slot_type' });
      await updateProjectPhaseForSlot(slotType);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).from('client_document_slots')
        .select('*').eq('client_profile_id', id);
      setDocSlots(data || []);
      toast({ title: `${SLOT_LABELS[slotType]} uploaded` });
    } catch {
      toast({ title: 'Upload failed', variant: 'destructive' });
    } finally {
      setUploadingSlot(null);
    }
  };

  const updateSlotStatus = async (slotType: string, status: DocumentSlot['status']) => {
    if (!id) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('client_document_slots').upsert({
      client_profile_id: id, slot_type: slotType, status,
    }, { onConflict: 'client_profile_id,slot_type' });
    setDocSlots((prev) => prev.map((s) => s.slot_type === slotType ? { ...s, status } : s));
  };

  const toggleSlotView = async (slotType: string) => {
    if (expandedSlot === slotType) {
      setExpandedSlot(null);
      return;
    }
    setExpandedSlot(slotType);
    const slot = docSlots.find((s) => s.slot_type === slotType);
    if (slot?.storage_path && !slotSignedUrls[slotType]) {
      const { data } = await supabase.storage.from('client-slot-docs')
        .createSignedUrl(slot.storage_path, 60 * 60 * 24 * 7);
      if (data?.signedUrl) {
        setSlotSignedUrls((prev) => ({ ...prev, [slotType]: data.signedUrl }));
      }
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (!profile) return;
    setLogoUploading(true);
    const existingLogo = assets.find((a) => a.category === 'logo' && a.type === 'file');
    if (existingLogo) {
      if (existingLogo.file_name) {
        await supabase.storage.from('client-assets').remove([existingLogo.file_name]);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('client_assets').delete().eq('id', existingLogo.id);
    }
    const storagePath = `${profile.id}/${Date.now()}_${file.name}`;
    const { error: upErr } = await supabase.storage.from('client-assets').upload(storagePath, file);
    if (upErr) {
      setLogoUploading(false);
      toast({ title: 'Logo upload failed', description: upErr.message, variant: 'destructive' });
      return;
    }
    const { data: urlData } = await supabase.storage
      .from('client-assets')
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('client_assets').insert({
      client_profile_id: profile.id,
      type: 'file',
      category: 'logo',
      label: 'Primary Logo',
      file_name: storagePath,
      file_url: urlData?.signedUrl || '',
      file_size: file.size,
      sort_order: 0,
    });
    setLogoUploading(false);
    toast({ title: 'Logo uploaded' });
    fetchAll();
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!profile) return (
    <div className="py-12 text-center">
      <p className="text-muted-foreground mb-4">Client not found.</p>
      <Button asChild variant="outline"><Link to="/admin/clients"><ArrowLeft className="h-4 w-4 mr-2" /> Back</Link></Button>
    </div>
  );

  const activeRecurringAddOns = addOns.filter((a) => a.status === "active" && a.catalog?.type === "recurring");
  const totalMonthly = activeRecurringAddOns.reduce((sum, a) => sum + Number(a.price || 0), 0);
  const textAssets = assets.filter((a) => a.type === "text");
  const fileAssets = assets.filter((a) => a.type === "file");

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
          <TabsTrigger value="documents">Documents ({docs.length + docSlots.filter(s => s.status === 'uploaded').length})</TabsTrigger>
          <TabsTrigger value="projects">Projects ({projects.length})</TabsTrigger>
          <TabsTrigger value="addons">Add-Ons ({addOns.length})</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="plan">Plan</TabsTrigger>
          <TabsTrigger value="agreements">Agreements ({agreements.length})</TabsTrigger>
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
          {/* Project Documents */}
          <div className="border border-black/10 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-black/10 bg-gray-50/50">
              <h3 className="font-display text-sm tracking-wider">Project Documents</h3>
            </div>
            <div className="divide-y divide-black/5">
              {SLOT_TYPES.map((slotType) => {
                const slot = docSlots.find((s) => s.slot_type === slotType);
                const status = slot?.status || 'pending';
                const isUploading = uploadingSlot === slotType;
                const isAgreement = slotType === 'agreement';
                return (
                  <div key={slotType} className="flex items-center gap-3 px-4 py-3 flex-wrap">
                    <span className="text-sm font-medium w-48 shrink-0">{SLOT_LABELS[slotType]}</span>

                    {status === 'pending' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">Pending</span>
                    )}
                    {status === 'in_progress' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">In Progress</span>
                    )}
                    {status === 'uploaded' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">Uploaded ✓</span>
                    )}
                    {status === 'na' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-400 border border-gray-200">N/A</span>
                    )}

                    <div className="flex gap-2 ml-auto flex-wrap items-center">
                      {isUploading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}

                      {status === 'pending' && !isUploading && (
                        <>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateSlotStatus(slotType, 'in_progress')}>
                            In Progress
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => updateSlotStatus(slotType, 'na')}>
                            N/A
                          </Button>
                          {isAgreement ? (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAgreementDialogOpen(true)}>
                              Edit Agreement
                            </Button>
                          ) : (
                            <label className="inline-flex items-center gap-1 h-7 px-3 text-xs border border-black/20 rounded-md cursor-pointer hover:bg-black/5 transition-colors">
                              <input
                                type="file"
                                className="hidden"
                                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSlotUpload(slotType, f); e.target.value = ''; }}
                              />
                              <Upload className="h-3 w-3" /> Upload
                            </label>
                          )}
                        </>
                      )}

                      {status === 'in_progress' && !isUploading && (
                        <>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => updateSlotStatus(slotType, 'na')}>
                            N/A
                          </Button>
                          {isAgreement ? (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAgreementDialogOpen(true)}>
                              Edit Agreement
                            </Button>
                          ) : (
                            <label className="inline-flex items-center gap-1 h-7 px-3 text-xs border border-black/20 rounded-md cursor-pointer hover:bg-black/5 transition-colors">
                              <input
                                type="file"
                                className="hidden"
                                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSlotUpload(slotType, f); e.target.value = ''; }}
                              />
                              <Upload className="h-3 w-3" /> Upload
                            </label>
                          )}
                        </>
                      )}

                      {status === 'uploaded' && !isUploading && (
                        <>
                          {!isAgreement && slot?.storage_path && (
                            <Button
                              size="sm"
                              variant={expandedSlot === slotType ? "default" : "outline"}
                              className="h-7 text-xs"
                              onClick={() => toggleSlotView(slotType)}
                            >
                              {expandedSlot === slotType ? 'Close' : 'View'}
                            </Button>
                          )}
                          {!isAgreement && (
                            <label className="inline-flex items-center h-7 px-3 text-xs rounded-md cursor-pointer hover:bg-black/5 transition-colors text-muted-foreground">
                              <input
                                type="file"
                                className="hidden"
                                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSlotUpload(slotType, f); e.target.value = ''; }}
                              />
                              Re-upload
                            </label>
                          )}
                        </>
                      )}

                      {status === 'na' && !isUploading && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => updateSlotStatus(slotType, 'pending')}>
                          Undo N/A
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {expandedSlot && (() => {
              const slot = docSlots.find((s) => s.slot_type === expandedSlot);
              if (!slot || slot.status !== 'uploaded') return null;
              const url = slotSignedUrls[expandedSlot];
              const isImage = /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(slot.file_name || '');
              return (
                <div className="border-t border-black/10 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-black/5 bg-muted/30">
                    <span className="text-sm font-medium">{SLOT_LABELS[expandedSlot]}</span>
                    <div className="flex gap-3">
                      {url && (
                        <a href={url} download={slot.file_name} className="text-xs text-primary underline">
                          Download
                        </a>
                      )}
                      <button onClick={() => setExpandedSlot(null)} className="text-xs text-muted-foreground hover:text-black">
                        Close
                      </button>
                    </div>
                  </div>
                  {url ? (
                    isImage
                      ? <img src={url} alt={slot.file_name} className="max-w-full" />
                      : <iframe src={url} title={slot.file_name} className="w-full h-[700px] border-0" />
                  ) : (
                    <div className="p-8 text-center text-sm text-muted-foreground">Loading document...</div>
                  )}
                </div>
              );
            })()}
          </div>

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
                      onClick={() => signedUrl && editingDocId !== d.id && window.open(signedUrl, "_blank")}
                      disabled={!signedUrl || editingDocId === d.id}
                    >
                      <div className="h-36 bg-black/5 flex items-center justify-center overflow-hidden">
                        {isImage && signedUrl ? (
                          <img src={signedUrl} alt={d.title} className="w-full h-full object-cover" />
                        ) : (
                          <FileText className="h-14 w-14 text-black/20" />
                        )}
                      </div>
                      <div className="p-3">
                        {editingDocId === d.id ? (
                          <input
                            autoFocus
                            className="w-full text-sm font-medium bg-white border border-black/20 rounded px-1.5 py-0.5 text-black focus:outline-none focus:border-primary"
                            value={editingDocTitle}
                            onChange={(e) => setEditingDocTitle(e.target.value)}
                            onBlur={() => saveDocTitle(d)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveDocTitle(d);
                              if (e.key === "Escape") setEditingDocId(null);
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <p className="font-medium text-sm text-black truncate">{d.title}</p>
                        )}
                        <p className="text-xs text-black/50 mt-0.5">{format(new Date(d.created_at), "MMM d, yyyy")}</p>
                      </div>
                    </button>
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className="p-1 rounded-full bg-white/80 hover:bg-blue-50 text-black/40 hover:text-blue-600"
                        onClick={(e) => { e.stopPropagation(); setEditingDocId(d.id); setEditingDocTitle(d.title); }}
                        title="Rename"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="p-1 rounded-full bg-white/80 hover:bg-red-50 text-black/40 hover:text-red-600"
                        onClick={(e) => { e.stopPropagation(); handleDeleteDoc(d); }}
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Intake Responses collapsible */}
          <div className="border border-black/10 rounded-xl overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-black hover:bg-black/5 transition-colors"
              onClick={() => setIntakesOpen((o) => !o)}
            >
              <span>Intake Responses</span>
              {intakesOpen ? <ChevronUp className="h-4 w-4 text-black/40" /> : <ChevronDown className="h-4 w-4 text-black/40" />}
            </button>
            {intakesOpen && (
              <div className="border-t border-black/10 px-4 pb-4">
                {intakes.length === 0 ? (
                  <p className="text-sm text-muted-foreground pt-4 text-center">No intake submissions yet.</p>
                ) : (
                  <div className="space-y-5 pt-4">
                    {intakes.map((intake) => (
                      <div key={intake.id}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs text-muted-foreground">
                            Submitted {format(new Date(intake.created_at), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                          <Badge variant="outline" className="text-xs capitalize">{intake.status}</Badge>
                        </div>
                        {intake.responses && Object.keys(intake.responses).length > 0 ? (
                          <dl className="space-y-2">
                            {Object.values(intake.responses).map((r, idx) => (
                              <div key={idx} className="border-l-2 border-black/10 pl-3">
                                <dt className="text-xs uppercase tracking-wider text-black/40">{r.label}</dt>
                                <dd className="text-sm text-black/80 whitespace-pre-wrap mt-0.5">
                                  {r.value || <span className="italic text-black/30">—</span>}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">No responses recorded.</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
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

        {/* ADD-ONS */}
        <TabsContent value="addons" className="mt-4 space-y-4">
          {activeRecurringAddOns.length > 0 && (
            <div className="rounded-lg bg-teal-50 border border-teal-200 px-4 py-2.5 flex items-center gap-2 text-sm text-teal-700">
              <span className="font-medium">
                {activeRecurringAddOns.length} active retainer{activeRecurringAddOns.length !== 1 ? "s" : ""}
              </span>
              <span className="text-teal-400">·</span>
              <span>estimated ${Math.round(totalMonthly).toLocaleString()} / mo</span>
            </div>
          )}
          <div className="flex justify-end">
            <Button size="sm" onClick={openAssignDialog}>
              <Plus className="h-4 w-4 mr-2" /> Assign Add-On
            </Button>
          </div>
          {addOns.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No add-ons assigned yet.</p>
          ) : (
            <div className="space-y-2">
              {addOns.map((addon) => {
                const displayName = addon.custom_name || addon.catalog?.name || "Unknown service";
                const type = addon.catalog?.type || "recurring";
                const isExpanded = expandedNotes.has(addon.id);
                const hasLongNotes = addon.notes && addon.notes.length > 80;
                return (
                  <Card key={addon.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <span className="font-medium text-sm">{displayName}</span>
                            <Badge variant="outline" className="text-xs">
                              {type === "recurring" ? "Recurring" : "One-time"}
                            </Badge>
                            {addon.status === "active" && (
                              <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100 text-xs">Active</Badge>
                            )}
                            {addon.status === "paused" && (
                              <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100 text-xs">Paused</Badge>
                            )}
                            {addon.status === "cancelled" && (
                              <Badge className="bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-100 text-xs">Cancelled</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm flex-wrap">
                            <span className="font-medium">{formatAddonPrice(addon.price, type)}</span>
                            {addon.start_date && (
                              <span className="text-muted-foreground">from {format(new Date(addon.start_date), "MMM d, yyyy")}</span>
                            )}
                          </div>
                          {addon.notes && (
                            <p className="mt-2 text-sm text-muted-foreground">
                              {isExpanded || !hasLongNotes ? addon.notes : `${addon.notes.slice(0, 80)}...`}
                              {hasLongNotes && (
                                <button
                                  className="ml-1 text-xs text-primary hover:underline"
                                  onClick={() => toggleNote(addon.id)}
                                >
                                  {isExpanded ? "less" : "more"}
                                </button>
                              )}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button size="sm" variant="ghost" onClick={() => openEditAddOn(addon)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {addon.status !== "cancelled" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                              title="Cancel this add-on"
                              onClick={() => removeAddOn(addon)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ASSETS */}
        <TabsContent value="assets" className="mt-4 space-y-6">
          {/* Primary Logo */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-base tracking-wider">Primary Logo</h3>
            </div>
            {(() => {
              const logoAsset = assets.find((a) => a.category === 'logo' && a.type === 'file');
              const logoUrl = logoAsset ? assetSignedUrls[logoAsset.id] : null;
              if (logoAsset) {
                return (
                  <div className="border border-black/10 rounded-xl p-4 flex items-start gap-4">
                    <div className="h-24 w-32 bg-gray-50 rounded-lg border border-black/5 flex items-center justify-center overflow-hidden shrink-0">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Primary Logo" className="max-h-full max-w-full object-contain" />
                      ) : (
                        <Loader2 className="h-6 w-6 animate-spin text-black/20" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Primary Logo</p>
                      {logoAsset.file_name && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{logoAsset.file_name.split('/').pop()}</p>
                      )}
                      <div className="flex gap-2 mt-3">
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); e.target.value = ''; }}
                          />
                          <div className={`inline-flex items-center gap-2 h-9 px-3 text-sm border border-black/20 rounded-md hover:bg-black/5 transition-colors ${logoUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                            {logoUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                            Replace Logo
                          </div>
                        </label>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => deleteAsset(logoAsset)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              }
              return (
                <label className="cursor-pointer block">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); e.target.value = ''; }}
                  />
                  <div className="border-2 border-dashed border-black/15 rounded-xl py-10 px-6 text-center hover:border-primary/40 hover:bg-primary/5 transition-colors">
                    {logoUploading ? (
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
                    ) : (
                      <Upload className="h-8 w-8 text-black/20 mx-auto mb-2" />
                    )}
                    <p className="text-sm font-medium text-black/60">Upload Client Logo</p>
                    <p className="text-xs text-muted-foreground mt-1">Used in agreement header and branding</p>
                  </div>
                </label>
              );
            })()}
          </div>

          {/* Text Assets */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-base tracking-wider">Brand Identity</h3>
              <Button size="sm" onClick={() => setAddTextAssetOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add Text Asset
              </Button>
            </div>
            {textAssets.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No brand identity assets yet.</p>
            ) : (
              <div className="space-y-3">
                {textAssets.map((asset) => {
                  const { classes, label: catLabel } = assetCategoryInfo(asset.category);
                  return (
                    <Card key={asset.id}>
                      <CardContent className="pt-4 group">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <Badge className={`${classes} hover:${classes} text-xs`}>{catLabel}</Badge>
                              <span className="font-medium text-sm">{asset.label}</span>
                            </div>
                            <p className="text-sm text-black/80 whitespace-pre-wrap">{asset.content}</p>
                          </div>
                          <button
                            className="p-1 rounded hover:bg-red-50 text-black/30 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5"
                            onClick={() => deleteAsset(asset)}
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* File Assets */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-base tracking-wider">Brand Files</h3>
              <Button size="sm" onClick={() => setAddFileAssetOpen(true)}>
                <Upload className="h-4 w-4 mr-2" /> Upload File
              </Button>
            </div>
            {fileAssets.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No brand files uploaded yet.</p>
            ) : (
              <div className="space-y-2">
                {fileAssets.map((asset) => {
                  const { classes, label: catLabel } = assetCategoryInfo(asset.category);
                  const signedUrl = assetSignedUrls[asset.id];
                  const displayName = asset.file_name ? asset.file_name.split("/").pop() : "";
                  return (
                    <Card key={asset.id}>
                      <CardContent className="pt-4 group flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={`${classes} hover:${classes} text-xs`}>{catLabel}</Badge>
                            <span className="font-medium text-sm">{asset.label}</span>
                            {displayName && (
                              <span className="text-xs text-muted-foreground truncate max-w-[180px]">{displayName}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {signedUrl && (
                            <a
                              href={signedUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded hover:bg-blue-50 text-black/40 hover:text-blue-600 transition-colors"
                              title="Download"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </a>
                          )}
                          <button
                            className="p-1 rounded hover:bg-red-50 text-black/30 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => deleteAsset(asset)}
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* PLAN */}
        <TabsContent value="plan" className="mt-4 space-y-4">
          {/* Create Plan Dialog */}
          <Dialog open={showCreatePlanDialog} onOpenChange={setShowCreatePlanDialog}>
            <DialogContent style={lightVars}>
              <DialogHeader>
                <DialogTitle>Create Project Plan</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <label className="text-sm font-medium mb-1 block">Project Name</label>
                  <Input value={newPlanName} onChange={e => setNewPlanName(e.target.value)} placeholder="Website Project" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Status</label>
                  <Select value={newPlanStatus} onValueChange={(v: "planning" | "active") => setNewPlanStatus(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Start Date</label>
                    <Input type="date" value={newPlanStart} onChange={e => setNewPlanStart(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Target / Deadline</label>
                    <Input type="date" value={newPlanEnd} onChange={e => setNewPlanEnd(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Project Overview</label>
                  <Textarea value={newPlanOverview} onChange={e => setNewPlanOverview(e.target.value)} placeholder="Brief description of the project scope and goals…" rows={3} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">GitHub Repository <span className="text-muted-foreground font-normal">(optional)</span></label>
                  <Input value={newPlanGithub} onChange={e => setNewPlanGithub(e.target.value)} placeholder="https://github.com/username/repo" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreatePlanDialog(false)}>Cancel</Button>
                <Button onClick={createPlan} disabled={creatingPlan}>
                  {creatingPlan && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Create Plan
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {!plan ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground mb-4">No project plan yet.</p>
              <Button onClick={() => setShowCreatePlanDialog(true)}>
                <Plus className="h-4 w-4 mr-2" /> Create Project Plan
              </Button>
            </div>
          ) : (
            <>
              {/* Plan header */}
              <Card>
                <CardContent className="pt-6 space-y-4">
                  {editingPlanName ? (
                    <input
                      autoFocus
                      className="text-xl font-display font-medium w-full bg-transparent border-b-2 border-primary focus:outline-none pb-1"
                      value={editingPlanNameValue}
                      onChange={(e) => setEditingPlanNameValue(e.target.value)}
                      onBlur={async () => {
                        setEditingPlanName(false);
                        const trimmed = editingPlanNameValue.trim();
                        if (trimmed && trimmed !== plan.project_name) await savePlan({ project_name: trimmed });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        if (e.key === "Escape") setEditingPlanName(false);
                      }}
                    />
                  ) : (
                    <button
                      className="text-xl font-display font-medium text-left hover:text-primary transition-colors"
                      onClick={() => { setEditingPlanName(true); setEditingPlanNameValue(plan.project_name); }}
                    >
                      {plan.project_name}
                    </button>
                  )}

                  <div className="flex items-center gap-4 flex-wrap">
                    <Select
                      value={plan.status}
                      onValueChange={(v) => savePlan({ status: v as ProjectPlan["status"] })}
                    >
                      <SelectTrigger className="w-36 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent style={lightVars} className="bg-white text-black">
                        <SelectItem value="planning">Planning</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="review">In Review</SelectItem>
                        <SelectItem value="complete">Complete</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                      <span className="text-2xl font-display font-semibold text-teal-600 tabular-nums w-16 shrink-0">
                        {plan.completion_percent}%
                      </span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-teal-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, plan.completion_percent)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Timeline Tracker */}
                  {(() => {
                    if (!plan.start_date || !plan.target_date) {
                      return (
                        <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-2 flex items-center gap-2 text-xs text-gray-400">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          Add start and target dates to enable schedule tracking
                        </div>
                      );
                    }
                    const today = new Date();
                    const startDate = new Date(plan.start_date);
                    const targetDate = new Date(plan.target_date);
                    const totalDays = Math.max(1, Math.round((targetDate.getTime() - startDate.getTime()) / 86400000));
                    const elapsedDays = Math.round((today.getTime() - startDate.getTime()) / 86400000);
                    const expectedPct = Math.min(100, Math.round((elapsedDays / totalDays) * 100));
                    const delta = plan.completion_percent - expectedPct;
                    const isAhead = delta >= 5;
                    const isBehind = delta <= -10;
                    const statusLabel = isAhead ? "Ahead of Schedule" : isBehind ? "Behind Schedule" : "On Track";
                    const containerClasses = isAhead
                      ? "bg-green-50 border-green-200 text-green-700"
                      : isBehind
                      ? "bg-red-50 border-red-200 text-red-700"
                      : "bg-teal-50 border-teal-200 text-teal-700";
                    const deltaStr = delta >= 0 ? `+${delta}%` : `${delta}%`;
                    return (
                      <div className={`rounded-lg border px-4 py-2 flex items-center gap-3 text-xs ${containerClasses}`}>
                        <Clock className="h-3.5 w-3.5 shrink-0 opacity-70" />
                        <span className="opacity-70">Expected {expectedPct}%</span>
                        <span className="font-bold tabular-nums">{deltaStr}</span>
                        <span className="font-semibold">{statusLabel}</span>
                        <span className="ml-auto opacity-70">Actual {plan.completion_percent}%</span>
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Start Date</Label>
                      <Input
                        type="date"
                        value={plan.start_date || ""}
                        onChange={(e) => setPlan((prev) => prev ? { ...prev, start_date: e.target.value } : null)}
                        onBlur={(e) => savePlan({ start_date: e.target.value || null })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Target Date</Label>
                      <Input
                        type="date"
                        value={plan.target_date || ""}
                        onChange={(e) => setPlan((prev) => prev ? { ...prev, target_date: e.target.value } : null)}
                        onBlur={(e) => savePlan({ target_date: e.target.value || null })}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Overview</Label>
                    <Textarea
                      rows={3}
                      value={plan.overview || ""}
                      onChange={(e) => setPlan((prev) => prev ? { ...prev, overview: e.target.value } : null)}
                      onBlur={(e) => savePlan({ overview: e.target.value || null })}
                      placeholder="Brief project overview..."
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">GitHub Repository</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        value={plan.github_url || ""}
                        onChange={(e) => setPlan((prev) => prev ? { ...prev, github_url: e.target.value } : null)}
                        onBlur={(e) => savePlan({ github_url: e.target.value || null })}
                        placeholder="https://github.com/username/repo"
                        className="flex-1"
                      />
                      {plan.github_url && (
                        <a href={plan.github_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline whitespace-nowrap">
                          Open ↗
                        </a>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Phases */}
              <div>
                <h3 className="font-display text-base tracking-wider mb-3">Project Phases</h3>
                {phases.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No phases added yet.</p>
                ) : (
                  <div className="space-y-2">
                    {phases.map((phase, idx) => (
                      <Card key={phase.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-start gap-3">
                            <div className="flex flex-col gap-0.5 pt-1 shrink-0">
                              <button
                                className="p-0.5 rounded hover:bg-black/5 text-black/30 hover:text-black/60 disabled:opacity-20"
                                onClick={() => movePhase(phase.id, "up")}
                                disabled={idx === 0}
                              >
                                <ArrowUp className="h-3 w-3" />
                              </button>
                              <button
                                className="p-0.5 rounded hover:bg-black/5 text-black/30 hover:text-black/60 disabled:opacity-20"
                                onClick={() => movePhase(phase.id, "down")}
                                disabled={idx === phases.length - 1}
                              >
                                <ArrowDown className="h-3 w-3" />
                              </button>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-2">
                                {editingPhaseId === phase.id ? (
                                  <input
                                    autoFocus
                                    className="font-medium text-sm bg-transparent border-b border-primary focus:outline-none"
                                    value={editingPhaseName}
                                    onChange={(e) => setEditingPhaseName(e.target.value)}
                                    onBlur={() => saveEditedPhaseName(phase)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                                      if (e.key === "Escape") setEditingPhaseId(null);
                                    }}
                                  />
                                ) : (
                                  <button
                                    className="font-medium text-sm text-left hover:text-primary transition-colors"
                                    onClick={() => { setEditingPhaseId(phase.id); setEditingPhaseName(phase.name); }}
                                  >
                                    {phase.name}
                                  </button>
                                )}
                                <Select
                                  value={phase.status}
                                  onValueChange={(v) => updatePhase(phase.id, { status: v as ProjectPhase["status"] })}
                                >
                                  <SelectTrigger className="h-6 w-28 text-xs px-2">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent style={lightVars} className="bg-white text-black">
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="complete">Complete</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="flex items-center gap-3 mb-1.5">
                                <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                                  <div
                                    className="bg-teal-400 h-1.5 rounded-full transition-all duration-300"
                                    style={{ width: `${Math.min(100, phase.completion_percent)}%` }}
                                  />
                                </div>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={phase.completion_percent}
                                  onChange={(e) => {
                                    const v = Math.max(0, Math.min(100, Number(e.target.value)));
                                    setPhases((prev) => prev.map((p) => p.id === phase.id ? { ...p, completion_percent: v } : p));
                                  }}
                                  onBlur={(e) => {
                                    const v = Math.max(0, Math.min(100, Number(e.target.value)));
                                    updatePhase(phase.id, { completion_percent: v });
                                  }}
                                  className="w-16 text-xs border border-black/10 rounded px-2 py-1 text-center focus:outline-none focus:border-teal-400"
                                />
                                <span className="text-xs text-muted-foreground w-6">%</span>
                              </div>

                              {phase.description && (
                                <p className="text-xs text-muted-foreground">{phase.description}</p>
                              )}
                            </div>

                            <button
                              className="p-1 rounded hover:bg-red-50 text-black/30 hover:text-red-500 shrink-0 mt-0.5 transition-colors"
                              onClick={() => deletePhase(phase.id)}
                              title="Delete phase"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 mt-3">
                  <Input
                    value={newPhaseName}
                    onChange={(e) => setNewPhaseName(e.target.value)}
                    placeholder="New phase name..."
                    className="flex-1"
                    onKeyDown={(e) => { if (e.key === "Enter") addPhase(); }}
                  />
                  <Button size="sm" onClick={addPhase} disabled={!newPhaseName.trim() || addingPhase}>
                    {addingPhase ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Updates */}
              <div>
                <h3 className="font-display text-base tracking-wider mb-3">Project Updates</h3>

                <div className="space-y-2 mb-4">
                  <Textarea
                    rows={3}
                    value={newUpdateContent}
                    onChange={(e) => setNewUpdateContent(e.target.value)}
                    placeholder="Add an update, note, or milestone..."
                  />
                  <Button
                    size="sm"
                    onClick={addUpdate}
                    disabled={!newUpdateContent.trim() || newUpdateSaving}
                  >
                    {newUpdateSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Post Update
                  </Button>
                </div>

                {planUpdates.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No updates yet.</p>
                ) : (
                  <div className="space-y-2">
                    {planUpdates.map((update) => (
                      <Card key={update.id}>
                        <CardContent className="pt-4">
                          <p className="text-sm whitespace-pre-wrap">{update.content}</p>
                          <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-medium text-black/60">{update.author}</span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(update.created_at), "MMM d, yyyy 'at' h:mm a")}
                              </span>
                              {update.is_client_visible && (
                                <Badge className="bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-50 text-xs">
                                  Client can see this
                                </Badge>
                              )}
                            </div>
                            <button
                              className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-colors shrink-0 ${
                                update.is_client_visible
                                  ? "bg-teal-50 border-teal-300 text-teal-600"
                                  : "bg-gray-50 border-gray-200 text-gray-400 hover:border-gray-300"
                              }`}
                              onClick={() => toggleUpdateVisibility(update.id, !update.is_client_visible)}
                              title={update.is_client_visible ? "Hide from client" : "Make visible to client"}
                            >
                              {update.is_client_visible
                                ? <Eye className="h-3 w-3" />
                                : <EyeOff className="h-3 w-3" />}
                              <span>Visible to client</span>
                            </button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Tasks */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="font-display text-base tracking-wider">Tasks</h3>
                  {tasks.length > 0 && (
                    <Badge variant="outline" className="text-xs">{tasks.length}</Badge>
                  )}
                </div>

                {/* For Client */}
                <div className="mb-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">For Client</p>
                  {tasks.filter((t) => t.assigned_to === "client").length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">No tasks assigned to client yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {tasks.filter((t) => t.assigned_to === "client").map((task) => (
                        <Card key={task.id} className="group">
                          <CardContent className="pt-3 pb-3">
                            <div className="flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <Badge className={
                                    task.priority === "high"
                                      ? "bg-red-100 text-red-700 border-red-200 hover:bg-red-100 text-xs"
                                      : task.priority === "low"
                                      ? "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100 text-xs"
                                      : "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 text-xs"
                                  }>
                                    {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                                  </Badge>
                                  <Badge className="bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-50 text-xs">Client</Badge>
                                  <span className="font-medium text-sm">{task.title}</span>
                                </div>
                                {task.description && (
                                  <p className="text-xs text-muted-foreground mb-1">{task.description}</p>
                                )}
                                {task.due_date && (
                                  <p className="text-xs text-muted-foreground">Due {format(new Date(task.due_date), "MMM d, yyyy")}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Select
                                  value={task.status}
                                  onValueChange={(v) => updateTaskStatus(task.id, v as ProjectTask["status"])}
                                >
                                  <SelectTrigger className="h-7 w-28 text-xs px-2">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent style={lightVars} className="bg-white text-black">
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="complete">Complete</SelectItem>
                                  </SelectContent>
                                </Select>
                                <button
                                  className="p-1 rounded hover:bg-red-50 text-black/20 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => deleteTask(task.id)}
                                  title="Delete task"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* For Aethyx */}
                <div className="mb-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">For Aethyx</p>
                  {tasks.filter((t) => t.assigned_to === "aethyx").length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">No tasks for Aethyx yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {tasks.filter((t) => t.assigned_to === "aethyx").map((task) => (
                        <Card key={task.id} className="group">
                          <CardContent className="pt-3 pb-3">
                            <div className="flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <Badge className={
                                    task.priority === "high"
                                      ? "bg-red-100 text-red-700 border-red-200 hover:bg-red-100 text-xs"
                                      : task.priority === "low"
                                      ? "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100 text-xs"
                                      : "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 text-xs"
                                  }>
                                    {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                                  </Badge>
                                  <Badge className="bg-purple-100 border-purple-200 text-purple-700 hover:bg-purple-100 text-xs">Aethyx</Badge>
                                  <span className="font-medium text-sm">{task.title}</span>
                                </div>
                                {task.description && (
                                  <p className="text-xs text-muted-foreground mb-1">{task.description}</p>
                                )}
                                {task.due_date && (
                                  <p className="text-xs text-muted-foreground">Due {format(new Date(task.due_date), "MMM d, yyyy")}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Select
                                  value={task.status}
                                  onValueChange={(v) => updateTaskStatus(task.id, v as ProjectTask["status"])}
                                >
                                  <SelectTrigger className="h-7 w-28 text-xs px-2">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent style={lightVars} className="bg-white text-black">
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="complete">Complete</SelectItem>
                                  </SelectContent>
                                </Select>
                                <button
                                  className="p-1 rounded hover:bg-red-50 text-black/20 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => deleteTask(task.id)}
                                  title="Delete task"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add Task form */}
                <div className="border border-black/10 rounded-xl p-4 space-y-3 bg-gray-50/50">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Add Task</p>
                  <Input
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Task title..."
                    className="bg-white"
                    onKeyDown={(e) => { if (e.key === "Enter") addTask(); }}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Assigned to</Label>
                      <Select value={newTaskAssignedTo} onValueChange={(v) => setNewTaskAssignedTo(v as "client" | "aethyx")}>
                        <SelectTrigger className="h-8 text-xs mt-1 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent style={lightVars} className="bg-white text-black">
                          <SelectItem value="client">Client</SelectItem>
                          <SelectItem value="aethyx">Aethyx</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Priority</Label>
                      <Select value={newTaskPriority} onValueChange={(v) => setNewTaskPriority(v as "low" | "normal" | "high")}>
                        <SelectTrigger className="h-8 text-xs mt-1 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent style={lightVars} className="bg-white text-black">
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Due date</Label>
                      <Input
                        type="date"
                        value={newTaskDueDate}
                        onChange={(e) => setNewTaskDueDate(e.target.value)}
                        className="h-8 text-xs mt-1 bg-white"
                      />
                    </div>
                  </div>
                  {!showTaskDescription ? (
                    <button
                      className="text-xs text-primary hover:underline"
                      onClick={() => setShowTaskDescription(true)}
                    >
                      + Add description
                    </button>
                  ) : (
                    <Textarea
                      rows={2}
                      value={newTaskDescription}
                      onChange={(e) => setNewTaskDescription(e.target.value)}
                      placeholder="Task description (optional)..."
                      className="bg-white text-sm"
                    />
                  )}
                  <Button
                    size="sm"
                    onClick={addTask}
                    disabled={!newTaskTitle.trim() || addingTask}
                  >
                    {addingTask && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    <ListTodo className="h-4 w-4 mr-2" />
                    Add Task
                  </Button>
                </div>
              </div>
            </>
          )}
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

      {/* Assign Add-On */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-md bg-white text-black" style={lightVars}>
          <DialogHeader><DialogTitle className="text-black">Assign Add-On</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-black">Service</Label>
              <Select
                value={assignCatalogId}
                onValueChange={(v) => {
                  setAssignCatalogId(v);
                  const cat = catalog.find((c) => c.id === v);
                  if (cat?.price_min != null) setAssignPrice(String(cat.price_min));
                }}
              >
                <SelectTrigger className="bg-white text-black border-black/20">
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent style={lightVars} className="bg-white text-black">
                  {catalog.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-black">Custom name (optional)</Label>
              <Input
                value={assignCustomName}
                onChange={(e) => setAssignCustomName(e.target.value)}
                className="bg-white text-black border-black/20"
                placeholder="Leave blank to use catalog name"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-black">Price ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={assignPrice}
                  onChange={(e) => setAssignPrice(e.target.value)}
                  className="bg-white text-black border-black/20"
                />
              </div>
              <div>
                <Label className="text-black">Start date</Label>
                <Input
                  type="date"
                  value={assignStartDate}
                  onChange={(e) => setAssignStartDate(e.target.value)}
                  className="bg-white text-black border-black/20"
                />
              </div>
            </div>
            <div>
              <Label className="text-black">Notes</Label>
              <Textarea
                rows={3}
                value={assignNotes}
                onChange={(e) => setAssignNotes(e.target.value)}
                className="bg-white text-black border-black/20"
              />
            </div>
            <Button
              onClick={assignAddOn}
              disabled={assignSaving || !assignCatalogId || !assignPrice}
              className="w-full"
            >
              {assignSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Assign
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Add-On */}
      <Dialog open={!!editAddOn} onOpenChange={(open) => { if (!open) setEditAddOn(null); }}>
        <DialogContent className="sm:max-w-md bg-white text-black" style={lightVars}>
          <DialogHeader><DialogTitle className="text-black">Edit Add-On</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-black">Status</Label>
              <Select value={editAddOnStatus} onValueChange={setEditAddOnStatus}>
                <SelectTrigger className="bg-white text-black border-black/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={lightVars} className="bg-white text-black">
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-black">Price ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editAddOnPrice}
                  onChange={(e) => setEditAddOnPrice(e.target.value)}
                  className="bg-white text-black border-black/20"
                />
              </div>
              <div>
                <Label className="text-black">End date</Label>
                <Input
                  type="date"
                  value={editAddOnEndDate}
                  onChange={(e) => setEditAddOnEndDate(e.target.value)}
                  className="bg-white text-black border-black/20"
                />
              </div>
            </div>
            <div>
              <Label className="text-black">Notes</Label>
              <Textarea
                rows={3}
                value={editAddOnNotes}
                onChange={(e) => setEditAddOnNotes(e.target.value)}
                className="bg-white text-black border-black/20"
              />
            </div>
            <Button
              onClick={saveEditAddOn}
              disabled={editAddOnSaving || !editAddOnPrice}
              className="w-full"
            >
              {editAddOnSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Text Asset */}
      <Dialog open={addTextAssetOpen} onOpenChange={setAddTextAssetOpen}>
        <DialogContent className="sm:max-w-md bg-white text-black" style={lightVars}>
          <DialogHeader><DialogTitle className="text-black">Add Text Asset</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-black">Category</Label>
              <Select value={textAssetCategory} onValueChange={(v) => setTextAssetCategory(v as AssetCategory)}>
                <SelectTrigger className="bg-white text-black border-black/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={lightVars} className="bg-white text-black">
                  <SelectItem value="brand_voice">Brand Voice</SelectItem>
                  <SelectItem value="tagline">Tagline</SelectItem>
                  <SelectItem value="motto">Motto</SelectItem>
                  <SelectItem value="mission">Mission Statement</SelectItem>
                  <SelectItem value="values">Brand Values</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-black">Label</Label>
              <Input
                value={textAssetLabel}
                onChange={(e) => setTextAssetLabel(e.target.value)}
                placeholder="e.g. Primary Tagline, Homepage Hero"
                className="bg-white text-black border-black/20"
              />
            </div>
            <div>
              <Label className="text-black">Content</Label>
              <Textarea
                rows={4}
                value={textAssetContent}
                onChange={(e) => setTextAssetContent(e.target.value)}
                className="bg-white text-black border-black/20"
              />
            </div>
            <Button
              onClick={addTextAsset}
              disabled={textAssetSaving || !textAssetLabel.trim() || !textAssetContent.trim()}
              className="w-full"
            >
              {textAssetSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Add Asset
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Agreement */}
      <Dialog open={agreementDialogOpen} onOpenChange={setAgreementDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-white text-black" style={lightVars}>
          <DialogHeader><DialogTitle className="text-black">Edit Agreement</DialogTitle></DialogHeader>
          <div className="p-6 border border-black/10 rounded-xl bg-gray-50 text-center">
            <p className="text-sm text-muted-foreground">Agreement builder — use the AgreementDocument component</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload File Asset */}
      <Dialog open={addFileAssetOpen} onOpenChange={setAddFileAssetOpen}>
        <DialogContent className="sm:max-w-md bg-white text-black" style={lightVars}>
          <DialogHeader><DialogTitle className="text-black">Upload Brand File</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-black">Category</Label>
              <Select value={fileAssetCategory} onValueChange={(v) => setFileAssetCategory(v as AssetCategory)}>
                <SelectTrigger className="bg-white text-black border-black/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={lightVars} className="bg-white text-black">
                  <SelectItem value="logo">Logo</SelectItem>
                  <SelectItem value="guideline">Brand Guideline</SelectItem>
                  <SelectItem value="font">Font</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-black">Label</Label>
              <Input
                value={fileAssetLabel}
                onChange={(e) => setFileAssetLabel(e.target.value)}
                placeholder="e.g. Primary Logo, Brand Guide 2024"
                className="bg-white text-black border-black/20"
              />
            </div>
            <div>
              <Label className="text-black">File</Label>
              <Input
                type="file"
                accept="image/*,.pdf,.zip,.ttf,.otf,.woff,.woff2"
                onChange={(e) => setFileAssetFile(e.target.files?.[0] || null)}
                className="bg-white text-black border-black/20"
              />
            </div>
            <Button
              onClick={uploadFileAsset}
              disabled={fileAssetUploading || !fileAssetLabel.trim() || !fileAssetFile}
              className="w-full"
            >
              {fileAssetUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              Upload
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientDetail;
