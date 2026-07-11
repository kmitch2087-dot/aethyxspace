import { useEffect, useState } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Loader2, Save, Upload, Mail, Plus, ExternalLink,
  AlertTriangle, CheckCircle2, Trash2, RefreshCcw, FileText, Bell, Pencil, XCircle,
  ChevronDown, ChevronUp, Download, ArrowUp, ArrowDown,
  Eye, EyeOff, Clock, ListTodo, FolderInput, Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { PROJECT_TYPES, DEFAULT_PROJECT_TYPE, getProjectTypeTemplate, type ProjectTypeKey, type SlotTemplate } from "@/lib/projectTemplates";
import AgreementDocument from "@/components/AgreementDocument";
import DocumentViewer from "@/components/DocumentViewer";

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
  referral_enabled: boolean;
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

interface DocRow { id: string; title: string; file_url: string; created_at: string; parent_admin_doc_id: string | null; }
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
  slot_type: string;
  status: 'pending' | 'in_progress' | 'uploaded' | 'na' | 'in_preparation' | 'awaiting_signature' | 'completed';
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
  price: number | null;
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
  bg_color?: string | null;
}

interface ProjectPlan {
  id: string;
  client_profile_id: string;
  project_name: string;
  overview?: string | null;
  completion_percent: number;
  status: "planning" | "active" | "review" | "complete" | "paused" | "abandoned";
  start_date?: string | null;
  target_date?: string | null;
  github_url?: string | null;
  project_type: string;
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

function getSlotsForPlan(plan: ProjectPlan | null): SlotTemplate[] {
  if (!plan) return [];
  return getProjectTypeTemplate(plan.project_type).defaultSlots ?? [];
}
function getSlotLabel(plan: ProjectPlan | null, slotType: string): string {
  return getSlotsForPlan(plan).find((s) => s.key === slotType)?.label ?? slotType;
}
function getSlotPhaseName(plan: ProjectPlan | null, slotType: string): string {
  return getSlotsForPlan(plan).find((s) => s.key === slotType)?.phaseName ?? slotType;
}
function getAgreementSlotKey(plan: ProjectPlan | null): string | null {
  return getSlotsForPlan(plan).find((s) => s.isAgreement)?.key ?? null;
}
function getNonAgreementSlotKeys(plan: ProjectPlan | null): string[] {
  return getSlotsForPlan(plan).filter((s) => !s.isAgreement).map((s) => s.key);
}

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
    abandoned: { classes: "bg-red-100 text-red-700 border-red-200", label: "Archived" },
  };
  return map[status] ?? map.planning;
}

const ClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "profile";
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
  const [lastSignIn, setLastSignIn] = useState<string | null>(null);
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
  const [viewingDoc, setViewingDoc] = useState<DocRow | null>(null);
  const [assignSlotDoc, setAssignSlotDoc] = useState<DocRow | null>(null);
  const [assignSlotType, setAssignSlotType] = useState<string>("");
  const [assigningSlot, setAssigningSlot] = useState(false);

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
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editingLabelValue, setEditingLabelValue] = useState("");
  const [scrapeDialogOpen, setScrapeDialogOpen] = useState(false);
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pendingScrapeItems, setPendingScrapeItems] = useState<any[]>([]);
  const [scrapeItemUrls, setScrapeItemUrls] = useState<Record<string, string>>({});
  const [scrapeItemsLoading, setScrapeItemsLoading] = useState(false);
  const [promotingItemId, setPromotingItemId] = useState<string | null>(null);

  // Plan
  // A client can have multiple project plans (one per engagement type — website build,
  // Google Ads, etc). `plan` below is derived: whichever plan is currently selected.
  const [allPlans, setAllPlans] = useState<ProjectPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const plan = allPlans.find((p) => p.id === selectedPlanId) || allPlans[0] || null;
  const slotCapablePlan = allPlans.find((p) => getProjectTypeTemplate(p.project_type).usesDocumentSlots);
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [planUpdates, setPlanUpdates] = useState<ProjectUpdate[]>([]);
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [showCreatePlanDialog, setShowCreatePlanDialog] = useState(false);
  const [newPlanType, setNewPlanType] = useState<ProjectTypeKey>(DEFAULT_PROJECT_TYPE);
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [agreementRecord, setAgreementRecord] = useState<any | null>(null);
  const [agreementRecordLoading, setAgreementRecordLoading] = useState(false);

  // Logo upload
  const [logoUploading, setLogoUploading] = useState(false);

  const fetchSignedUrls = async (rows: DocRow[]) => {
    if (!rows.length) { setDocUrls({}); return; }
    const clientBucketRows = rows.filter((d) => !d.parent_admin_doc_id);
    const adminBucketRows = rows.filter((d) => d.parent_admin_doc_id);
    const map: Record<string, string> = {};
    const [clientSigned, adminSigned] = await Promise.all([
      clientBucketRows.length
        ? supabase.storage.from("client-documents").createSignedUrls(clientBucketRows.map((d) => d.file_url), 3600)
        : Promise.resolve({ data: [] as { path: string | null; signedUrl: string }[] }),
      adminBucketRows.length
        ? supabase.storage.from("admin-documents").createSignedUrls(adminBucketRows.map((d) => d.file_url), 3600)
        : Promise.resolve({ data: [] as { path: string | null; signedUrl: string }[] }),
    ]);
    (clientSigned.data || []).forEach((item) => {
      const doc = clientBucketRows.find((d) => d.file_url === item.path);
      if (doc && item.signedUrl) map[doc.id] = item.signedUrl;
    });
    (adminSigned.data || []).forEach((item) => {
      const doc = adminBucketRows.find((d) => d.file_url === item.path);
      if (doc && item.signedUrl) map[doc.id] = item.signedUrl;
    });
    setDocUrls(map);
  };

  const fetchAssetSignedUrls = async (fileAssets: ClientAsset[]) => {
    if (!fileAssets.length) return;
    const withPath = fileAssets.filter((a) => a.file_name);
    const paths = withPath.map((a) => a.file_name!);
    const { data } = await supabase.storage.from("client-assets").createSignedUrls(paths, 60 * 60 * 24 * 7);
    if (!data) return;
    const map: Record<string, string> = {};
    for (const item of data) {
      const asset = withPath.find((a) => a.file_name === item.path);
      if (asset && item.signedUrl) map[asset.id] = item.signedUrl;
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
    const [inv, dc, ag, it, ms, ls, pr, ao, as_] = await Promise.all([
      supabase.from("client_invoices").select("*").eq("client_profile_id", id).order("created_at", { ascending: false }),
      supabase.from("client_documents").select("*").or(`client_profile_id.eq.${id},user_id.eq.${p.user_id}`).order("created_at", { ascending: false }),
      emailLc
        ? supabase.from("client_agreements").select("*").or(`client_profile_id.eq.${id},client_email.eq.${emailLc}`).order("created_at", { ascending: false })
        : supabase.from("client_agreements").select("*").eq("client_profile_id", id).order("created_at", { ascending: false }),
      emailLc
        ? supabase.from("client_intakes").select("*").or(`client_profile_id.eq.${id},email.eq.${emailLc}`).order("created_at", { ascending: false })
        : supabase.from("client_intakes").select("*").eq("client_profile_id", id).order("created_at", { ascending: false }),
      supabase.from("client_messages").select("*").or(`client_profile_id.eq.${id},user_id.eq.${p.user_id}`).order("created_at", { ascending: false }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).rpc("get_client_last_sign_ins"),
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lastSignInData = (ls.data as any as Array<{ client_profile_id: string; last_sign_in_at: string | null }>) || [];
    const thisClientLastSignIn = lastSignInData.find((r) => r.client_profile_id === id)?.last_sign_in_at || null;
    setLastSignIn(thisClientLastSignIn);
    setProjects((pr.data as ProjectRow[]) || []);
    setAddOns((ao.data as AddOnRow[]) || []);
    const assetRows = (as_.data as ClientAsset[]) || [];
    setAssets(assetRows);
    setLoading(false);
    fetchSignedUrls(docRows);
    fetchAssetSignedUrls(assetRows.filter((a) => a.type === "file"));
  };

  const fetchPlan = async (preferPlanId?: string) => {
    if (!id) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: plansData } = await (supabase as any)
      .from("client_project_plans")
      .select("*")
      .eq("client_profile_id", id)
      .order("created_at", { ascending: true });
    const fetchedPlans = (plansData as ProjectPlan[]) || [];
    setAllPlans(fetchedPlans);

    // Decide which plan should be selected: an explicit request, the currently
    // selected one if it still exists, otherwise the first plan.
    const stillExists = selectedPlanId && fetchedPlans.some((p) => p.id === selectedPlanId);
    const nextSelectedId = preferPlanId || (stillExists ? selectedPlanId : fetchedPlans[0]?.id) || null;
    if (nextSelectedId !== selectedPlanId) setSelectedPlanId(nextSelectedId);

    const activePlanData = fetchedPlans.find((p) => p.id === nextSelectedId) || null;
    if (activePlanData) {
      const [{ data: phasesData }, { data: updatesData }, { data: tasksData }] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("client_project_phases").select("*").eq("plan_id", activePlanData.id).order("sort_order"),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("client_project_updates").select("*").eq("plan_id", activePlanData.id).order("created_at", { ascending: false }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("client_project_tasks").select("*").eq("plan_id", activePlanData.id).order("sort_order"),
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

  // Switch which of the client's plans is displayed in the Plan tab.
  const selectPlan = (planId: string) => {
    setSelectedPlanId(planId);
    fetchPlan(planId);
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

  const fetchAgreementRecord = async () => {
    if (!id) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from("client_agreement_records")
      .select("*")
      .eq("client_profile_id", id)
      .maybeSingle();
    setAgreementRecord(data);
  };

  useEffect(() => { fetchAll(); fetchPlan(); fetchAgreementRecord(); fetchPendingScrapeItems(); /* eslint-disable-next-line */ }, [id]);
  useEffect(() => { fetchCatalog(); }, []);

  // Auto-create a Website Build plan if the client doesn't have one yet — every
  // client should have at least this one by default. Other project types (Google
  // Ads, etc.) are added explicitly via "+ New Project" and never auto-created.
  useEffect(() => {
    if (!id) return;
    const ensureWebsitePlan = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingWebsitePlan } = await (supabase as any)
        .from('client_project_plans').select('id').eq('client_profile_id', id)
        .eq('project_type', 'website_build').maybeSingle();
      if (!existingWebsitePlan) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('client_project_plans').insert({
          client_profile_id: id, project_name: 'Website Project', status: 'planning',
          completion_percent: 0, project_type: 'website_build',
        });
        fetchPlan();
      }
    };
    ensureWebsitePlan();
    /* eslint-disable-next-line */
  }, [id]);

  // Seed document slots for every project type the client currently has a plan for
  // — each plan's own defaultSlots (from projectTemplates.ts), not a fixed global
  // list. Re-runs (idempotently, via upsert+ignoreDuplicates) whenever allPlans
  // changes/loads, so this correctly waits for fetchPlan() to populate allPlans
  // rather than racing it.
  useEffect(() => {
    if (!id || allPlans.length === 0) return;
    const seedSlots = async () => {
      const allSlotTemplates = allPlans.flatMap((p) => getSlotsForPlan(p));
      if (allSlotTemplates.length === 0) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('client_document_slots').upsert(
        allSlotTemplates.map((s) => ({ client_profile_id: id, slot_type: s.key })),
        { onConflict: 'client_profile_id,slot_type', ignoreDuplicates: true },
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: slotsData } = await (supabase as any)
        .from('client_document_slots').select('*').eq('client_profile_id', id);
      setDocSlots((slotsData as DocumentSlot[]) || []);
    };
    seedSlots();
  }, [id, allPlans]);

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

  const toggleReferralEnabled = async () => {
    if (!profile) return;
    const next = !profile.referral_enabled;
    setProfile({ ...profile, referral_enabled: next });
    const { error } = await supabase
      .from("client_profiles")
      .update({ referral_enabled: next })
      .eq("id", profile.id);
    if (error) {
      setProfile((p) => (p ? { ...p, referral_enabled: !next } : p));
      toast({ title: "Failed to update referral access", description: error.message, variant: "destructive" });
    } else {
      toast({ title: next ? "Referral access enabled" : "Referral access disabled" });
    }
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
    setEditAddOnPrice(addon.price != null ? String(addon.price) : "");
    setEditAddOnNotes(addon.notes || "");
    setEditAddOnEndDate(addon.end_date || "");
  };

  const saveEditAddOn = async () => {
    if (!editAddOn) return;
    setEditAddOnSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("client_add_ons").update({
      status: editAddOnStatus,
      price: editAddOnPrice.trim() ? parseFloat(editAddOnPrice) : null,
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

  const fetchPendingScrapeItems = async () => {
    if (!id) return;
    setScrapeItemsLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: scrapes } = await (supabase as any)
      .from("client_asset_scrapes")
      .select("id")
      .eq("client_profile_id", id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scrapeIds = (scrapes || []).map((s: any) => s.id);
    if (!scrapeIds.length) {
      setPendingScrapeItems([]);
      setScrapeItemsLoading(false);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: items } = await (supabase as any)
      .from("client_asset_scrape_items")
      .select("*")
      .in("scrape_id", scrapeIds)
      .eq("status", "pending")
      .order("created_at");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (items || []) as any[];
    setPendingScrapeItems(rows);
    setScrapeItemsLoading(false);

    const imageItems = rows.filter((r) => r.kind === "image");
    if (imageItems.length) {
      const { data: signed } = await supabase.storage
        .from("client-assets")
        .createSignedUrls(imageItems.map((r) => r.content), 3600);
      const map: Record<string, string> = {};
      (signed || []).forEach((s) => {
        const match = imageItems.find((r) => r.content === s.path);
        if (match && s.signedUrl) map[match.id] = s.signedUrl;
      });
      setScrapeItemUrls(map);
    }
  };

  const handleScrape = async () => {
    if (!profile || !scrapeUrl.trim()) return;
    setScraping(true);
    const { data, error } = await supabase.functions.invoke("scrape-client-assets", {
      body: { clientProfileId: profile.id, url: scrapeUrl.trim() },
    });
    setScraping(false);
    if (error || !data?.ok) {
      toast({ title: "Scrape failed", description: error?.message || data?.error, variant: "destructive" });
      return;
    }
    toast({
      title: "Scrape complete",
      description: `Found ${data.imageCount} image(s) and ${data.textCount} text item(s) for review.`,
    });
    setScrapeDialogOpen(false);
    setScrapeUrl("");
    fetchPendingScrapeItems();
  };

  const approveScrapeItem = async (item: { id: string; kind: string; suggested_category: string; suggested_label: string; content: string | null }) => {
    if (!profile) return;
    setPromotingItemId(item.id);
    if (item.kind === "text") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("client_assets").insert({
        client_profile_id: profile.id,
        type: "text",
        category: item.suggested_category,
        label: item.suggested_label,
        content: item.content,
        sort_order: assets.filter((a) => a.type === "text").length,
      });
      if (error) {
        toast({ title: "Failed to approve", description: error.message, variant: "destructive" });
        setPromotingItemId(null);
        return;
      }
    } else {
      const { data: urlData } = await supabase.storage
        .from("client-assets")
        .createSignedUrl(item.content!, 60 * 60 * 24 * 7);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("client_assets").insert({
        client_profile_id: profile.id,
        type: "file",
        category: item.suggested_category,
        label: item.suggested_label,
        file_name: item.content,
        file_url: urlData?.signedUrl || "",
        sort_order: assets.filter((a) => a.type === "file").length,
      });
      if (error) {
        toast({ title: "Failed to approve", description: error.message, variant: "destructive" });
        setPromotingItemId(null);
        return;
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("client_asset_scrape_items").update({ status: "approved" }).eq("id", item.id);
    setPendingScrapeItems((prev) => prev.filter((i) => i.id !== item.id));
    setPromotingItemId(null);
    toast({ title: "Asset added" });
    fetchAll();
  };

  const rejectScrapeItem = async (itemId: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("client_asset_scrape_items").update({ status: "rejected" }).eq("id", itemId);
    setPendingScrapeItems((prev) => prev.filter((i) => i.id !== itemId));
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

  const saveAssetLabel = async (asset: ClientAsset, newLabel: string) => {
    setEditingLabelId(null);
    const trimmed = newLabel.trim();
    if (!trimmed || trimmed === asset.label) return;
    await (supabase as any).from("client_assets").update({ label: trimmed }).eq("id", asset.id);
    setAssets((prev) => prev.map((a) => a.id === asset.id ? { ...a, label: trimmed } : a));
  };

  const saveAssetBgColor = async (asset: ClientAsset, color: string | null) => {
    await (supabase as any).from("client_assets").update({ bg_color: color }).eq("id", asset.id);
    setAssets((prev) => prev.map((a) => a.id === asset.id ? { ...a, bg_color: color } : a));
  };

  // Plan handlers
  const createPlan = async () => {
    if (!profile) return;
    setCreatingPlan(true);
    const template = getProjectTypeTemplate(newPlanType);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: inserted, error } = await (supabase as any).from("client_project_plans").insert({
      client_profile_id: profile.id,
      project_name: newPlanName.trim() || template.defaultProjectName,
      status: newPlanStatus,
      completion_percent: 0,
      project_type: newPlanType,
      ...(newPlanStart ? { start_date: newPlanStart } : {}),
      ...(newPlanEnd ? { target_date: newPlanEnd } : {}),
      ...(newPlanOverview.trim() ? { overview: newPlanOverview.trim() } : {}),
      ...(newPlanGithub.trim() ? { github_url: newPlanGithub.trim() } : {}),
    }).select().single();
    if (error || !inserted) {
      setCreatingPlan(false);
      toast({ title: "Failed to create plan", description: error?.message, variant: "destructive" });
      return;
    }
    // Seed default phases from the chosen project type's template.
    if (template.defaultPhases.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from("client_project_phases").insert(
        template.defaultPhases.map((phase, i) => ({
          plan_id: inserted.id,
          name: phase.name,
          description: phase.description || null,
          status: "pending",
          completion_percent: 0,
          sort_order: i,
        })),
      );
    }
    setCreatingPlan(false);
    setShowCreatePlanDialog(false);
    setNewPlanType(DEFAULT_PROJECT_TYPE);
    setNewPlanName("Website Project");
    setNewPlanStatus("planning");
    setNewPlanStart("");
    setNewPlanEnd("");
    setNewPlanOverview("");
    setNewPlanGithub("");
    fetchPlan(inserted.id);
  };

  // Optimistic local update for controlled inputs (paired with savePlan on blur).
  const updatePlanLocal = (updates: Partial<ProjectPlan>) => {
    if (!plan) return;
    setAllPlans((prev) => prev.map((p) => (p.id === plan.id ? { ...p, ...updates } : p)));
  };

  const savePlan = async (updates: Partial<ProjectPlan>) => {
    if (!plan) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("client_project_plans")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", plan.id);
    if (!error) {
      setAllPlans((prev) => prev.map((p) => (p.id === plan.id ? { ...p, ...updates } : p)));
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
    // Slot keys are namespaced per project type (e.g. ga_* for Google Ads), so find
    // which of the client's plans this slot actually belongs to instead of assuming
    // Website Build.
    const owningPlan = allPlans.find((p) => getSlotsForPlan(p).some((s) => s.key === slotType));
    if (!owningPlan) return;
    const phaseName = getSlotPhaseName(owningPlan, slotType);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase as any).from('client_project_phases')
      .select('id').eq('plan_id', owningPlan.id).ilike('name', phaseName).maybeSingle();
    if (existing) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('client_project_phases')
        .update({ completion_percent: 100, status: 'complete', updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: phaseCount } = await (supabase as any).from('client_project_phases')
        .select('id').eq('plan_id', owningPlan.id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('client_project_phases').insert({
        plan_id: owningPlan.id, name: phaseName, completion_percent: 100,
        status: 'complete', sort_order: (phaseCount?.length || 0),
      });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: allPhases } = await (supabase as any).from('client_project_phases')
      .select('completion_percent').eq('plan_id', owningPlan.id);
    if (allPhases?.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const avg = Math.round(allPhases.reduce((s: number, p: any) => s + p.completion_percent, 0) / allPhases.length);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('client_project_plans')
        .update({ completion_percent: avg, updated_at: new Date().toISOString() }).eq('id', owningPlan.id);
    }
  };

  const checkAndTriggerAgreement = async (currentSlots: DocumentSlot[], owningPlan: ProjectPlan) => {
    const agreementKey = getAgreementSlotKey(owningPlan);
    if (!agreementKey) return; // this project type has no agreement slot (e.g. Google Ads)
    const agreementSlot = currentSlots.find((s) => s.slot_type === agreementKey);
    if (!agreementSlot || !['pending', 'in_progress'].includes(agreementSlot.status)) return;
    const nonAgreementKeys = getNonAgreementSlotKeys(owningPlan);
    const allOthersDone = nonAgreementKeys.every((t) => {
      const s = currentSlots.find((sl) => sl.slot_type === t);
      return s?.status === 'uploaded' || s?.status === 'na';
    });
    if (allOthersDone && id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('client_document_slots').upsert(
        { client_profile_id: id, slot_type: agreementKey, status: 'in_preparation' },
        { onConflict: 'client_profile_id,slot_type' },
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).from('client_document_slots').select('*').eq('client_profile_id', id);
      setDocSlots((data as DocumentSlot[]) || []);
    }
  };

  const handleSlotUpload = async (slotType: string, file: File) => {
    if (!id) return;
    const owningPlan = allPlans.find((p) => getSlotsForPlan(p).some((s) => s.key === slotType));
    setUploadingSlot(slotType);
    try {
      const path = `${id}/${slotType}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('client-slot-docs').upload(path, file);
      if (uploadError) throw uploadError;
      const isAgreementSlot = owningPlan ? getAgreementSlotKey(owningPlan) === slotType : false;
      // Agreement upload → awaiting signature; all others → uploaded
      const newStatus = isAgreementSlot ? 'awaiting_signature' : 'uploaded';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('client_document_slots').upsert({
        client_profile_id: id, slot_type: slotType, status: newStatus,
        storage_path: path, file_name: file.name, file_size: file.size,
        uploaded_at: new Date().toISOString(),
      }, { onConflict: 'client_profile_id,slot_type' });
      if (!isAgreementSlot) await updateProjectPhaseForSlot(slotType);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).from('client_document_slots').select('*').eq('client_profile_id', id);
      const refreshed = (data as DocumentSlot[]) || [];
      setDocSlots(refreshed);
      if (!isAgreementSlot && owningPlan) await checkAndTriggerAgreement(refreshed, owningPlan);
      toast({ title: isAgreementSlot ? 'Proposal uploaded — awaiting client signature' : `${getSlotLabel(owningPlan, slotType)} uploaded` });
    } catch {
      toast({ title: 'Upload failed', variant: 'destructive' });
    } finally {
      setUploadingSlot(null);
    }
  };

  const handleAssignToSlot = async () => {
    if (!assignSlotDoc || !assignSlotType) return;
    setAssigningSlot(true);
    try {
      let path: string = assignSlotDoc.file_url;
      const marker = "/client-documents/";
      const idx = path.indexOf(marker);
      if (idx !== -1) path = path.substring(idx + marker.length);
      const bucket = assignSlotDoc.parent_admin_doc_id ? "admin-documents" : "client-documents";
      const { data: blob, error: downloadError } = await supabase.storage.from(bucket).download(path);
      if (downloadError || !blob) {
        toast({ title: "Could not read source file", description: downloadError?.message, variant: "destructive" });
        return;
      }
      const dotIdx = assignSlotDoc.file_url.lastIndexOf(".");
      const ext = dotIdx !== -1 ? assignSlotDoc.file_url.slice(dotIdx + 1) : "";
      const sanitizedTitle = assignSlotDoc.title.replace(/[^\w\-. ]/g, "_");
      const originalName = ext ? `${sanitizedTitle}.${ext}` : sanitizedTitle;
      const file = new File([blob], originalName, { type: blob.type });
      await handleSlotUpload(assignSlotType, file);
      setAssignSlotDoc(null);
      setAssignSlotType("");
    } finally {
      setAssigningSlot(false);
    }
  };

  const updateSlotStatus = async (slotType: string, status: DocumentSlot['status']) => {
    if (!id) return;
    const owningPlan = allPlans.find((p) => getSlotsForPlan(p).some((s) => s.key === slotType));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('client_document_slots').upsert(
      { client_profile_id: id, slot_type: slotType, status },
      { onConflict: 'client_profile_id,slot_type' },
    );
    const updated = docSlots.map((s) => s.slot_type === slotType ? { ...s, status } : s);
    setDocSlots(updated);
    const isAgreementSlot = owningPlan ? getAgreementSlotKey(owningPlan) === slotType : false;
    if (!isAgreementSlot && owningPlan) await checkAndTriggerAgreement(updated, owningPlan);
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
          <p className="text-xs text-muted-foreground">
            {lastSignIn ? `Last login ${new Date(lastSignIn).toLocaleDateString()}` : "Never logged in"}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/portal/overview?viewAs=${profile.id}`, "_blank", "noopener,noreferrer")}
          >
            <Eye className="h-4 w-4 mr-2" /> View as {profile.first_name || profile.full_name.split(" ")[0]}
          </Button>
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

      <Tabs defaultValue={initialTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({docs.length + docSlots.filter(s => ['uploaded', 'awaiting_signature', 'completed'].includes(s.status)).length})</TabsTrigger>
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
              <div className="flex items-center justify-between rounded-md border border-border/40 px-4 py-3">
                <div>
                  <Label>Referral program access</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {profile.referral_enabled
                      ? "This client can see the Referrals page and share their link."
                      : "This client cannot see the Referrals page yet."}
                  </p>
                </div>
                <Switch checked={profile.referral_enabled} onCheckedChange={toggleReferralEnabled} />
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
              {getSlotsForPlan(plan).map(({ key: slotType }) => {
                const slot = docSlots.find((s) => s.slot_type === slotType);
                const status = slot?.status || 'pending';
                const isUploading = uploadingSlot === slotType;
                const isAgreement = getAgreementSlotKey(plan) === slotType;
                return (
                  <div key={slotType} className="flex items-center gap-3 px-4 py-3 flex-wrap">
                    <span className="text-sm font-medium w-48 shrink-0">{getSlotLabel(plan, slotType)}</span>

                    {/* Status badges */}
                    {status === 'pending' && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">Pending</span>}
                    {status === 'in_progress' && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">In Progress</span>}
                    {status === 'uploaded' && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">Uploaded ✓</span>}
                    {status === 'na' && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-400 border border-gray-200">N/A</span>}
                    {status === 'in_preparation' && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">In Preparation</span>}
                    {status === 'awaiting_signature' && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">Awaiting Client Signature</span>}
                    {status === 'completed' && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">Signed ✓</span>}

                    <div className="flex gap-2 ml-auto flex-wrap items-center">
                      {isUploading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}

                      {/* Non-agreement slot controls */}
                      {!isAgreement && status === 'pending' && !isUploading && (
                        <>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateSlotStatus(slotType, 'in_progress')}>In Progress</Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => updateSlotStatus(slotType, 'na')}>N/A</Button>
                          <label className="inline-flex items-center gap-1 h-7 px-3 text-xs border border-black/20 rounded-md cursor-pointer hover:bg-black/5 transition-colors">
                            <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSlotUpload(slotType, f); e.target.value = ''; }} />
                            <Upload className="h-3 w-3" /> Upload
                          </label>
                        </>
                      )}
                      {!isAgreement && status === 'in_progress' && !isUploading && (
                        <>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => updateSlotStatus(slotType, 'na')}>N/A</Button>
                          <label className="inline-flex items-center gap-1 h-7 px-3 text-xs border border-black/20 rounded-md cursor-pointer hover:bg-black/5 transition-colors">
                            <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSlotUpload(slotType, f); e.target.value = ''; }} />
                            <Upload className="h-3 w-3" /> Upload
                          </label>
                        </>
                      )}
                      {!isAgreement && status === 'uploaded' && !isUploading && (
                        <>
                          {slot?.storage_path && (
                            <Button size="sm" variant={expandedSlot === slotType ? "default" : "outline"} className="h-7 text-xs" onClick={() => toggleSlotView(slotType)}>
                              {expandedSlot === slotType ? 'Close' : 'View'}
                            </Button>
                          )}
                          <label className="inline-flex items-center h-7 px-3 text-xs rounded-md cursor-pointer hover:bg-black/5 transition-colors text-muted-foreground">
                            <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSlotUpload(slotType, f); e.target.value = ''; }} />
                            Re-upload
                          </label>
                        </>
                      )}
                      {!isAgreement && status === 'na' && !isUploading && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => updateSlotStatus(slotType, 'pending')}>Undo N/A</Button>
                      )}

                      {/* Agreement slot controls */}
                      {isAgreement && !isUploading && (status === 'pending' || status === 'in_preparation') && (
                        <label className="inline-flex items-center gap-1 h-7 px-3 text-xs border border-black/20 rounded-md cursor-pointer hover:bg-black/5 transition-colors">
                          <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSlotUpload(slotType, f); e.target.value = ''; }} />
                          <Upload className="h-3 w-3" /> Upload Proposal
                        </label>
                      )}
                      {isAgreement && !isUploading && status === 'awaiting_signature' && (
                        <>
                          {slot?.storage_path && (
                            <Button size="sm" variant={expandedSlot === slotType ? "default" : "outline"} className="h-7 text-xs" onClick={() => toggleSlotView(slotType)}>
                              {expandedSlot === slotType ? 'Close' : 'View'}
                            </Button>
                          )}
                          <label className="inline-flex items-center h-7 px-3 text-xs rounded-md cursor-pointer hover:bg-black/5 transition-colors text-muted-foreground">
                            <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSlotUpload(slotType, f); e.target.value = ''; }} />
                            Re-upload
                          </label>
                          <Button size="sm" variant="outline" className="h-7 text-xs text-green-700 border-green-300" onClick={() => updateSlotStatus(slotType, 'completed')}>
                            Mark Signed
                          </Button>
                        </>
                      )}
                      {isAgreement && !isUploading && status === 'completed' && slot?.storage_path && (
                        <Button size="sm" variant={expandedSlot === slotType ? "default" : "outline"} className="h-7 text-xs" onClick={() => toggleSlotView(slotType)}>
                          {expandedSlot === slotType ? 'Close' : 'View'}
                        </Button>
                      )}
                      {/* placeholder to keep structure */}
                      {false && (
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
              const hasFile = ['uploaded', 'awaiting_signature', 'completed'].includes(slot?.status || '');
              if (!slot || !hasFile) return null;
              const url = slotSignedUrls[expandedSlot];
              return (
                <div className="border-t border-black/10 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-black/5 bg-muted/30">
                    <span className="text-sm font-medium">{getSlotLabel(plan, expandedSlot)}</span>
                    <button onClick={() => setExpandedSlot(null)} className="text-xs text-muted-foreground hover:text-black">
                      Close
                    </button>
                  </div>
                  <div className="p-4">
                    <DocumentViewer url={url || null} fileName={slot.file_name || ""} />
                  </div>
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
                      onClick={() => signedUrl && editingDocId !== d.id && setViewingDoc(d)}
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
                      {slotCapablePlan && (
                        <button
                          className="p-1 rounded-full bg-white/80 hover:bg-teal-50 text-black/40 hover:text-teal-600"
                          onClick={(e) => { e.stopPropagation(); setAssignSlotDoc(d); setAssignSlotType(""); }}
                          title="Assign to project slot"
                        >
                          <FolderInput className="h-3.5 w-3.5" />
                        </button>
                      )}
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
          {/* Project plan summary — click through to Plan tab */}
          {plan ? (
            <Card
              className="cursor-pointer hover:border-teal-400 transition-colors group"
              onClick={() => navigate(`/admin/clients/${id}?tab=plan`)}
            >
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm group-hover:text-teal-700 transition-colors">{plan.project_name}</p>
                    {plan.overview && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{plan.overview}</p>
                    )}
                    <div className="flex items-center gap-3 mt-3">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        <div className="bg-teal-500 h-1.5 rounded-full transition-all" style={{ width: `${plan.completion_percent}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-teal-700 tabular-nums shrink-0">{plan.completion_percent}%</span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        plan.status === 'active' ? 'bg-teal-100 text-teal-700' :
                        plan.status === 'complete' ? 'bg-green-100 text-green-700' :
                        plan.status === 'paused' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}</span>
                      {phases.length > 0 && (
                        <span className="text-xs text-muted-foreground">{phases.filter(p => p.status === 'complete').length} of {phases.length} phases complete</span>
                      )}
                      {plan.target_date && (
                        <span className="text-xs text-muted-foreground">Due {new Date(plan.target_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-teal-600 font-medium group-hover:underline shrink-0 mt-1">View Plan →</span>
                </div>
              </CardContent>
            </Card>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">No project plan yet — go to the Plan tab to create one.</p>
          )}
          {projects.length > 0 && projects.map((p) => (
            <Card key={p.id}><CardContent className="pt-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm text-muted-foreground">{p.name}</p>
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
                            {addon.status === "requested" && (
                              <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 text-xs">Requested</Badge>
                            )}
                            {addon.status === "paused" && (
                              <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100 text-xs">Paused</Badge>
                            )}
                            {addon.status === "cancelled" && (
                              <Badge className="bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-100 text-xs">Cancelled</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm flex-wrap">
                            <span className="font-medium">
                              {addon.price != null ? formatAddonPrice(addon.price, type) : "Awaiting price"}
                            </span>
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
                    <div className="h-24 w-32 bg-black rounded-lg border border-black/5 flex items-center justify-center overflow-hidden shrink-0">
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

          {/* AI Asset Scraping */}
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base tracking-wider">Scrape Website</h3>
            <Button size="sm" variant="outline" onClick={() => setScrapeDialogOpen(true)}>
              <Sparkles className="h-4 w-4 mr-2" /> Scrape from URL
            </Button>
          </div>

          {scrapeItemsLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : pendingScrapeItems.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Pending review ({pendingScrapeItems.length})</p>
              {pendingScrapeItems.map((item) => (
                <Card key={item.id}>
                  <CardContent className="pt-4 flex items-center gap-3">
                    {item.kind === "image" ? (
                      <div className="h-16 w-16 bg-black/5 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                        {scrapeItemUrls[item.id] ? (
                          <img src={scrapeItemUrls[item.id]} alt={item.suggested_label} className="max-h-full max-w-full object-contain" />
                        ) : (
                          <Loader2 className="h-4 w-4 animate-spin text-black/20" />
                        )}
                      </div>
                    ) : (
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-black/80 line-clamp-2">{item.content}</p>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <Badge variant="outline" className="text-xs mb-1">{assetCategoryInfo(item.suggested_category).label}</Badge>
                      <p className="text-sm font-medium truncate">{item.suggested_label}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={promotingItemId === item.id}
                        onClick={() => approveScrapeItem(item)}
                      >
                        {promotingItemId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Approve"}
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => rejectScrapeItem(item.id)}>
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

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
            ) : (() => {
              const assetCats = [
                {
                  id: "logos",
                  label: "Logos & Brand Marks",
                  match: (f: string) =>
                    /^logo_/i.test(f) ||
                    /pournogravyicon/i.test(f) ||
                    /pournogravylogo/i.test(f) ||
                    /back_logo_full/i.test(f) ||
                    /atheist_transparent/i.test(f) ||
                    /tagline_without_logo/i.test(f),
                },
                {
                  id: "print",
                  label: "Print Graphics",
                  match: (f: string) =>
                    /_(black|white)\.(png|svg)$/i.test(f) ||
                    /transparentflyerimg/i.test(f),
                },
                {
                  id: "photos",
                  label: "Photos",
                  match: (f: string) => /\.(jpe?g)$/i.test(f),
                },
                {
                  id: "social",
                  label: "Social & Web",
                  match: (f: string) =>
                    /fbprofilepic|blog.shots|flyer|pournogravylogo/i.test(f) ||
                    /\.webp$/i.test(f),
                },
                {
                  id: "mockups",
                  label: "Mockups & Tests",
                  match: (f: string) => /mockup|_test\.|atheist_test/i.test(f),
                },
              ];

              const BG_OPTIONS: { value: string | null; title: string; cls: string; swatch: string }[] = [
                { value: null,    title: "Auto",  cls: "bg-gray-50",  swatch: "bg-gradient-to-br from-gray-100 to-gray-300" },
                { value: "black", title: "Black", cls: "bg-black",    swatch: "bg-black" },
                { value: "white", title: "White", cls: "bg-white",    swatch: "bg-white border border-gray-300" },
                { value: "gray",  title: "Gray",  cls: "bg-gray-400", swatch: "bg-gray-400" },
              ];

              const renderThumb = (asset: ClientAsset, keyPrefix: string) => {
                const signedUrl = assetSignedUrls[asset.id];
                const fileName = asset.file_name ? asset.file_name.split("/").pop() ?? "" : "";
                const isImage = /\.(png|jpe?g|webp|gif|svg)$/i.test(fileName);
                const isWhiteGraphic = /_white[._]/i.test(fileName) || /_WHITE_INK/i.test(fileName);
                const autoBg = isWhiteGraphic ? "bg-black" : "bg-gray-50";
                const storedBg = BG_OPTIONS.find((o) => o.value === (asset.bg_color ?? null));
                const thumbBg = storedBg ? storedBg.cls : autoBg;
                const isEditing = editingLabelId === asset.id;
                return (
                  <div key={`${keyPrefix}-${asset.id}`} className="group relative rounded-lg border border-black/10 bg-white overflow-hidden flex flex-col">
                    <div className={`relative aspect-square ${thumbBg} flex items-center justify-center overflow-hidden`}>
                      {isImage && signedUrl ? (
                        <img src={signedUrl} alt={asset.label} className="w-full h-full object-contain p-1" />
                      ) : (
                        <div className="text-xs text-muted-foreground text-center px-2">{fileName}</div>
                      )}
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                        {/* Action row */}
                        <div className="flex items-center gap-1.5">
                          {signedUrl && (
                            <a href={signedUrl} target="_blank" rel="noreferrer"
                              className="p-1.5 rounded-full bg-white/90 text-black/70 hover:text-blue-600 transition-colors"
                              title="Download">
                              <Download className="h-3.5 w-3.5" />
                            </a>
                          )}
                          <button
                            className="p-1.5 rounded-full bg-white/90 text-black/70 hover:text-red-500 transition-colors"
                            onClick={() => deleteAsset(asset)}
                            title="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {/* Background color swatches */}
                        <div className="flex items-center gap-1">
                          {BG_OPTIONS.map((opt) => (
                            <button
                              key={String(opt.value)}
                              title={opt.title}
                              onClick={() => saveAssetBgColor(asset, opt.value)}
                              className={`w-4 h-4 rounded-full ${opt.swatch} ring-2 ring-white/60 hover:ring-white transition-all ${(asset.bg_color ?? null) === opt.value ? "ring-white scale-110" : ""}`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    {/* Editable label + download */}
                    <div className="px-2 py-1.5 border-t border-black/5 flex items-center gap-1">
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <input
                            autoFocus
                            className="w-full text-xs font-medium text-black/80 bg-transparent border-b border-teal-400 outline-none"
                            value={editingLabelValue}
                            onChange={(e) => setEditingLabelValue(e.target.value)}
                            onBlur={() => saveAssetLabel(asset, editingLabelValue)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveAssetLabel(asset, editingLabelValue);
                              if (e.key === "Escape") setEditingLabelId(null);
                            }}
                          />
                        ) : (
                          <p
                            className="text-xs font-medium truncate text-black/80 cursor-pointer hover:text-teal-700 transition-colors"
                            title="Click to rename"
                            onClick={() => { setEditingLabelId(asset.id); setEditingLabelValue(asset.label); }}
                          >
                            {asset.label}
                          </p>
                        )}
                      </div>
                      {signedUrl && (
                        <a
                          href={signedUrl}
                          target="_blank"
                          rel="noreferrer"
                          title="Download"
                          className="shrink-0 p-1 rounded text-black/30 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Download className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              };

              return (
                <div className="space-y-8">
                  {assetCats.map((cat) => {
                    const catAssets = fileAssets.filter((a) => {
                      const fn = (a.file_name ?? "").split("/").pop() ?? "";
                      return cat.match(fn);
                    });
                    if (catAssets.length === 0) return null;
                    return (
                      <div key={cat.id}>
                        <p className="text-xs font-semibold text-black/40 uppercase tracking-widest mb-3">
                          {cat.label} <span className="font-normal">({catAssets.length})</span>
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                          {catAssets.map((a) => renderThumb(a, cat.id))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
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
                  <label className="text-sm font-medium mb-1 block">Project Type</label>
                  <Select
                    value={newPlanType}
                    onValueChange={(v: ProjectTypeKey) => {
                      setNewPlanType(v);
                      const wasDefault = !newPlanName.trim() || PROJECT_TYPES.some((t) => t.defaultProjectName === newPlanName);
                      if (wasDefault) setNewPlanName(getProjectTypeTemplate(v).defaultProjectName);
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent style={lightVars} className="bg-white text-black">
                      {PROJECT_TYPES.map((t) => (
                        <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Seeds this plan with {getProjectTypeTemplate(newPlanType).defaultPhases.length} default phases for this project type.
                  </p>
                </div>
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

          {/* Plan switcher — only shown once a client has more than one project */}
          {allPlans.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {allPlans.map((p) => {
                const t = getProjectTypeTemplate(p.project_type);
                const isActive = plan?.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => selectPlan(p.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-transparent border-black/15 text-muted-foreground hover:border-black/30"
                    }`}
                  >
                    {p.project_name} <span className="opacity-60">· {t.label}</span>
                  </button>
                );
              })}
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowCreatePlanDialog(true)}>
                <Plus className="h-3 w-3 mr-1" /> New Project
              </Button>
            </div>
          )}

          {!plan ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground mb-4">No project plans yet.</p>
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        className="text-xl font-display font-medium text-left hover:text-primary transition-colors"
                        onClick={() => { setEditingPlanName(true); setEditingPlanNameValue(plan.project_name); }}
                      >
                        {plan.project_name}
                      </button>
                      <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                        {getProjectTypeTemplate(plan.project_type).label}
                      </Badge>
                    </div>
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
                        <SelectItem value="abandoned">Archived</SelectItem>
                      </SelectContent>
                    </Select>

                    {plan.status !== "abandoned" ? (
                      <button
                        className="text-xs text-red-400 hover:text-red-600 transition-colors underline-offset-2 hover:underline"
                        onClick={() => {
                          if (confirm("Abandon this project? It will be paused and archived. You can restore it anytime by changing the status.")) {
                            savePlan({ status: "abandoned" });
                          }
                        }}
                      >
                        Abandon / Did Not Accept
                      </button>
                    ) : (
                      <button
                        className="text-xs text-teal-600 hover:text-teal-800 transition-colors underline-offset-2 hover:underline"
                        onClick={() => savePlan({ status: "planning" })}
                      >
                        Restore Project
                      </button>
                    )}

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
                        onChange={(e) => updatePlanLocal({ start_date: e.target.value })}
                        onBlur={(e) => savePlan({ start_date: e.target.value || null })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Target Date</Label>
                      <Input
                        type="date"
                        value={plan.target_date || ""}
                        onChange={(e) => updatePlanLocal({ target_date: e.target.value })}
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
                      onChange={(e) => updatePlanLocal({ overview: e.target.value })}
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
                        onChange={(e) => updatePlanLocal({ github_url: e.target.value })}
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
                                  className="w-16 text-xs border border-black/10 rounded px-2 py-1 text-center focus:outline-none focus:border-teal-400 bg-white text-gray-900"
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
        <TabsContent value="agreements" className="mt-4 space-y-4">
          <div className="rounded-lg border border-border/30 p-4 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="font-medium text-sm">Service Agreement</p>
              <p className="text-xs text-muted-foreground">
                {!agreementRecord
                  ? "No agreement started yet."
                  : !agreementRecord.sent_at
                  ? "Draft — not yet sent to client."
                  : agreementRecord.is_locked
                  ? "Signed and locked."
                  : "Sent — awaiting client signature."}
              </p>
            </div>
            <Button
              size="sm"
              onClick={async () => {
                if (!agreementRecord) {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const { data, error } = await (supabase as any)
                    .from("client_agreement_records")
                    .insert({ client_profile_id: id })
                    .select("*")
                    .single();
                  if (error) {
                    toast({ title: "Could not create agreement", description: error.message, variant: "destructive" });
                    return;
                  }
                  setAgreementRecord(data);
                }
                setAgreementDialogOpen(true);
              }}
            >
              {agreementRecord ? "Open Agreement" : "Create Agreement"}
            </Button>
          </div>

          {agreements.length === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">No legacy agreements.</p> : agreements.map((a) => (
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

      <Dialog open={!!viewingDoc} onOpenChange={(open) => !open && setViewingDoc(null)}>
        <DialogContent className="sm:max-w-2xl bg-white text-black" style={lightVars}>
          <DialogHeader><DialogTitle className="text-black">{viewingDoc?.title}</DialogTitle></DialogHeader>
          {viewingDoc && (
            <DocumentViewer url={docUrls[viewingDoc.id] || null} fileName={viewingDoc.file_url} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!assignSlotDoc} onOpenChange={(open) => !open && setAssignSlotDoc(null)}>
        <DialogContent className="sm:max-w-md bg-white text-black" style={lightVars}>
          <DialogHeader><DialogTitle className="text-black">Assign to Project Slot</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Copy "{assignSlotDoc?.title}" into one of this project's document slots.
            </p>
            <Select value={assignSlotType} onValueChange={setAssignSlotType}>
              <SelectTrigger className="bg-white text-black border-black/20">
                <SelectValue placeholder="Choose a slot…" />
              </SelectTrigger>
              <SelectContent style={lightVars} className="bg-white text-black">
                {getSlotsForPlan(plan).map(({ key: slotType }) => (
                  <SelectItem key={slotType} value={slotType}>{getSlotLabel(plan, slotType)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleAssignToSlot}
              disabled={!assignSlotType || assigningSlot}
              className="w-full"
            >
              {assigningSlot && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Assign
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
                  <SelectItem value="requested">Requested</SelectItem>
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
              disabled={editAddOnSaving || (editAddOnPrice.trim() !== "" && isNaN(parseFloat(editAddOnPrice)))}
              className="w-full"
            >
              {editAddOnSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Scrape from URL */}
      <Dialog open={scrapeDialogOpen} onOpenChange={setScrapeDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white text-black" style={lightVars}>
          <DialogHeader><DialogTitle className="text-black">Scrape from URL</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-black">Client website URL</Label>
              <Input
                value={scrapeUrl}
                onChange={(e) => setScrapeUrl(e.target.value)}
                placeholder="https://example.com"
                className="bg-white text-black border-black/20"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Extracts images and brand copy for your review — nothing goes live until you approve it below.
              </p>
            </div>
            <Button onClick={handleScrape} disabled={scraping || !scrapeUrl.trim()} className="w-full">
              {scraping && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {scraping ? "Scraping…" : "Scrape"}
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
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto bg-white text-black" style={lightVars}>
          <DialogHeader><DialogTitle className="text-black">Service Agreement</DialogTitle></DialogHeader>
          {agreementRecord && (
            <AgreementDocument
              record={agreementRecord}
              clientProfileId={profile.id}
              clientName={profile.full_name}
              clientEmail={profile.email || ""}
              mode="admin"
              onSave={async (updates) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { error } = await (supabase as any)
                  .from("client_agreement_records")
                  .update(updates)
                  .eq("id", agreementRecord.id);
                if (error) throw error;
                setAgreementRecord((prev: typeof agreementRecord) => prev ? { ...prev, ...updates } : prev);
              }}
              onSubmit={() => {}}
            />
          )}
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
