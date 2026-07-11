import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { GitFork, Plus, Loader2, ChevronDown, ChevronUp, DollarSign, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

const lightVars = {
  "--background": "0 0% 100%", "--foreground": "0 0% 4%",
  "--card": "0 0% 98%", "--card-foreground": "0 0% 4%",
  "--popover": "0 0% 100%", "--popover-foreground": "0 0% 4%",
  "--muted": "0 0% 96%", "--muted-foreground": "0 0% 45%",
  "--input": "0 0% 93%", "--border": "0 0% 88%",
  "--secondary": "0 0% 96%", "--secondary-foreground": "0 0% 9%",
  "--accent": "0 0% 96%", "--accent-foreground": "0 0% 9%",
} as React.CSSProperties;

interface ProgramSettings {
  id: string;
  enabled: boolean;
  first_reward_amount: number;
  completion_bonus_amount: number;
  tier_threshold: number;
  commission_rate: number;
  new_client_discount: number;
  eligibility_notes: string | null;
  payout_methods: string[] | null;
}

interface ClientProfile {
  id: string;
  full_name: string;
  email: string | null;
}

interface Referral {
  id: string;
  referrer_profile_id: string | null;
  referred_email: string | null;
  referred_name: string | null;
  referred_profile_id: string | null;
  status: string;
  first_reward_paid_at: string | null;
  completion_bonus_paid_at: string | null;
  payout_method: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  referrer: { full_name: string; email: string | null } | null;
  referred_client: { full_name: string } | null;
}

interface BountyApplicant {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  relationship_note: string | null;
  tax_ack: boolean;
  status: "pending" | "approved" | "rejected";
  w9_file_path: string | null;
  w9_uploaded_at: string | null;
  code: string | null;
  applied_at: string;
  reviewed_at: string | null;
}

const STATUS_OPTIONS = ["pending", "signed", "live", "payout_sent", "cancelled"] as const;
type ReferralStatus = typeof STATUS_OPTIONS[number];

const STATUS_BADGE: Record<ReferralStatus, string> = {
  pending: "bg-blue-100 text-blue-800 border-blue-200",
  signed: "bg-purple-100 text-purple-800 border-purple-200",
  live: "bg-green-100 text-green-800 border-green-200",
  payout_sent: "bg-teal-100 text-teal-800 border-teal-200",
  cancelled: "bg-gray-100 text-gray-600 border-gray-200",
};

const STATUS_LABELS: Record<ReferralStatus, string> = {
  pending: "Pending",
  signed: "Signed",
  live: "Live",
  payout_sent: "Payout Sent",
  cancelled: "Cancelled",
};

const PAYOUT_METHODS = [
  { value: "paypal", label: "PayPal" },
  { value: "venmo", label: "Venmo" },
  { value: "credit", label: "Account Credit" },
];

export default function ReferralProgram() {
  const { toast } = useToast();

  const [settings, setSettings] = useState<ProgramSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);

  const [settingsForm, setSettingsForm] = useState({
    enabled: true,
    first_reward_amount: "200.00",
    completion_bonus_amount: "150.00",
    tier_threshold: "3",
    commission_rate: "10",
    new_client_discount: "100.00",
    eligibility_notes: "",
  });

  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [referralsLoading, setReferralsLoading] = useState(true);
  const [profiles, setProfiles] = useState<ClientProfile[]>([]);

  const [activeTab, setActiveTab] = useState("all");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [rowNotes, setRowNotes] = useState<Record<string, string>>({});
  const [savingNotes, setSavingNotes] = useState<string | null>(null);
  const [updatingRow, setUpdatingRow] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    referrer_profile_id: "",
    referred_name: "",
    referred_email: "",
    payout_method: "",
    notes: "",
  });
  const [addSubmitting, setAddSubmitting] = useState(false);

  const [applicants, setApplicants] = useState<BountyApplicant[]>([]);
  const [applicantsLoading, setApplicantsLoading] = useState(true);
  const [applicantTab, setApplicantTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [w9UploadingId, setW9UploadingId] = useState<string | null>(null);

  const fetchSettings = async () => {
    setSettingsLoading(true);
    const { data, error } = await supabase
      .from("referral_program_settings")
      .select("*")
      .limit(1)
      .single();
    setSettingsLoading(false);
    if (error || !data) return;
    const s = data as ProgramSettings;
    setSettings(s);
    setSettingsForm({
      enabled: s.enabled,
      first_reward_amount: s.first_reward_amount.toFixed(2),
      completion_bonus_amount: s.completion_bonus_amount.toFixed(2),
      tier_threshold: String(s.tier_threshold),
      commission_rate: String(Math.round(s.commission_rate * 100)),
      new_client_discount: s.new_client_discount.toFixed(2),
      eligibility_notes: s.eligibility_notes ?? "",
    });
  };

  const fetchReferrals = async () => {
    setReferralsLoading(true);
    const { data, error } = await supabase
      .from("referrals")
      .select("*, referrer:referrer_profile_id(full_name, email), referred_client:referred_profile_id(full_name)")
      .order("created_at", { ascending: false });
    setReferralsLoading(false);
    if (error) return;
    const rows = (data || []) as Referral[];
    setReferrals(rows);
    const notes: Record<string, string> = {};
    rows.forEach((r) => { notes[r.id] = r.notes ?? ""; });
    setRowNotes(notes);
  };

  const fetchProfiles = async () => {
    const { data } = await supabase
      .from("client_profiles")
      .select("id, full_name, email")
      .order("full_name");
    setProfiles((data as ClientProfile[]) || []);
  };

  const fetchApplicants = async () => {
    setApplicantsLoading(true);
    const { data } = await supabase
      .from("bounty_applicants")
      .select("*")
      .order("applied_at", { ascending: false });
    setApplicants((data as BountyApplicant[]) || []);
    setApplicantsLoading(false);
  };

  useEffect(() => {
    fetchSettings();
    fetchReferrals();
    fetchProfiles();
    fetchApplicants();
  }, []);

  const handleSaveSettings = async () => {
    if (!settings) return;
    setSettingsSaving(true);
    const { error } = await supabase
      .from("referral_program_settings")
      .update({
        enabled: settingsForm.enabled,
        first_reward_amount: parseFloat(settingsForm.first_reward_amount) || 0,
        completion_bonus_amount: parseFloat(settingsForm.completion_bonus_amount) || 0,
        tier_threshold: parseInt(settingsForm.tier_threshold) || 0,
        commission_rate: (parseFloat(settingsForm.commission_rate) || 0) / 100,
        new_client_discount: parseFloat(settingsForm.new_client_discount) || 0,
        eligibility_notes: settingsForm.eligibility_notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", settings.id);
    setSettingsSaving(false);
    if (error) {
      toast({ title: "Failed to save settings", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Settings saved" });
    fetchSettings();
  };

  const handleStatusChange = async (referral: Referral, status: string) => {
    setUpdatingRow(referral.id);
    const { error } = await supabase
      .from("referrals")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", referral.id);
    setUpdatingRow(null);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Status updated" });
    fetchReferrals();
  };

  const handleMarkFirstReward = async (referral: Referral) => {
    setUpdatingRow(referral.id);
    const { error } = await supabase
      .from("referrals")
      .update({ first_reward_paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", referral.id);
    setUpdatingRow(null);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "First reward marked as paid" });
    fetchReferrals();
  };

  const handleMarkBonus = async (referral: Referral) => {
    setUpdatingRow(referral.id);
    const { error } = await supabase
      .from("referrals")
      .update({ completion_bonus_paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", referral.id);
    setUpdatingRow(null);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Completion bonus marked as paid" });
    fetchReferrals();
  };

  const handleSaveNotes = async (referralId: string) => {
    setSavingNotes(referralId);
    const { error } = await supabase
      .from("referrals")
      .update({ notes: rowNotes[referralId] || null, updated_at: new Date().toISOString() })
      .eq("id", referralId);
    setSavingNotes(null);
    if (error) {
      toast({ title: "Failed to save notes", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Notes saved" });
    fetchReferrals();
  };

  const handleAddReferral = async () => {
    if (!addForm.referrer_profile_id || !addForm.referred_name.trim() || !addForm.referred_email.trim()) return;
    setAddSubmitting(true);
    const { error } = await supabase.from("referrals").insert({
      id: crypto.randomUUID(),
      referrer_profile_id: addForm.referrer_profile_id,
      referred_name: addForm.referred_name.trim(),
      referred_email: addForm.referred_email.trim(),
      payout_method: addForm.payout_method || null,
      notes: addForm.notes.trim() || null,
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setAddSubmitting(false);
    if (error) {
      toast({ title: "Failed to add referral", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Referral added" });
    setAddOpen(false);
    setAddForm({ referrer_profile_id: "", referred_name: "", referred_email: "", payout_method: "", notes: "" });
    fetchReferrals();
  };

  const handleW9Upload = async (applicant: BountyApplicant, file: File) => {
    setW9UploadingId(applicant.id);
    const path = `${applicant.id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from("bounty-documents").upload(path, file);
    if (uploadError) {
      setW9UploadingId(null);
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      return;
    }
    const { error } = await supabase
      .from("bounty_applicants")
      .update({ w9_file_path: path, w9_uploaded_at: new Date().toISOString() })
      .eq("id", applicant.id);
    setW9UploadingId(null);
    if (error) {
      toast({ title: "Failed to save W9 reference", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "W9 attached" });
    fetchApplicants();
  };

  const generateBountyCode = () => crypto.randomUUID().replace(/-/g, "").slice(0, 12);

  const handleApproveApplicant = async (applicant: BountyApplicant) => {
    setReviewingId(applicant.id);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("bounty_applicants")
      .update({
        status: "approved",
        code: generateBountyCode(),
        reviewed_at: new Date().toISOString(),
        reviewed_by: userData.user?.id ?? null,
      })
      .eq("id", applicant.id);
    setReviewingId(null);
    if (error) {
      toast({ title: "Approval failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Applicant approved" });
    fetchApplicants();
  };

  const handleRejectApplicant = async (applicant: BountyApplicant) => {
    setReviewingId(applicant.id);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("bounty_applicants")
      .update({ status: "rejected", reviewed_at: new Date().toISOString(), reviewed_by: userData.user?.id ?? null })
      .eq("id", applicant.id);
    setReviewingId(null);
    if (error) {
      toast({ title: "Rejection failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Applicant rejected" });
    fetchApplicants();
  };

  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);

  const handleSendApprovalEmail = async (applicant: BountyApplicant) => {
    setSendingEmailId(applicant.id);
    const { data, error } = await supabase.functions.invoke("bounty-actions", {
      body: { action: "send_approval_email", applicantId: applicant.id },
    });
    setSendingEmailId(null);
    if (error || !data?.success) {
      toast({ title: "Failed to send email", description: error?.message || data?.error, variant: "destructive" });
      return;
    }
    toast({ title: "Approval email sent" });
  };

  const filteredReferrals = activeTab === "all"
    ? referrals
    : referrals.filter((r) => r.status === activeTab);

  const canMarkFirstReward = (r: Referral) =>
    !r.first_reward_paid_at && ["signed", "live", "payout_sent"].includes(r.status);

  const summaryLine = settings
    ? `Referrer earns $${settings.first_reward_amount.toFixed(0)} on signing + $${settings.completion_bonus_amount.toFixed(0)} on go-live. After ${settings.tier_threshold} referrals, they earn ${Math.round(settings.commission_rate * 100)}% per project. New clients get $${settings.new_client_discount.toFixed(0)} off.`
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display tracking-wider flex items-center gap-2">
          <GitFork className="h-6 w-6 text-primary" /> Bounty Program
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Manage bounty applications, rewards, settings, and track all referral activity.</p>
      </div>

      {/* Settings Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Program Settings</CardTitle>
        </CardHeader>
        <CardContent>
          {settingsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="program-enabled" className="font-medium">Program enabled</Label>
                  {!settingsForm.enabled && (
                    <p className="text-xs text-amber-600 mt-0.5">Program is currently paused</p>
                  )}
                </div>
                <Switch
                  id="program-enabled"
                  checked={settingsForm.enabled}
                  onCheckedChange={(v) => setSettingsForm((f) => ({ ...f, enabled: v }))}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label>First reward ($)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={settingsForm.first_reward_amount}
                    onChange={(e) => setSettingsForm((f) => ({ ...f, first_reward_amount: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Paid to referrer when referred signs</p>
                </div>
                <div>
                  <Label>Completion bonus ($)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={settingsForm.completion_bonus_amount}
                    onChange={(e) => setSettingsForm((f) => ({ ...f, completion_bonus_amount: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Bonus when referred project goes live</p>
                </div>
                <div>
                  <Label>Commission tier threshold</Label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={settingsForm.tier_threshold}
                    onChange={(e) => setSettingsForm((f) => ({ ...f, tier_threshold: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Referrals needed to unlock commission</p>
                </div>
                <div>
                  <Label>Commission rate (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={settingsForm.commission_rate}
                    onChange={(e) => setSettingsForm((f) => ({ ...f, commission_rate: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Earned per project after threshold</p>
                </div>
                <div>
                  <Label>New client discount ($)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={settingsForm.new_client_discount}
                    onChange={(e) => setSettingsForm((f) => ({ ...f, new_client_discount: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Discount off referred client's first invoice</p>
                </div>
              </div>

              <div>
                <Label>Eligibility notes</Label>
                <Textarea
                  rows={3}
                  value={settingsForm.eligibility_notes}
                  onChange={(e) => setSettingsForm((f) => ({ ...f, eligibility_notes: e.target.value }))}
                  placeholder="Freeform eligibility rules, terms, and conditions…"
                />
              </div>

              {summaryLine && (
                <p className="text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2 italic">{summaryLine}</p>
              )}

              <Button onClick={handleSaveSettings} disabled={settingsSaving || !settings} size="sm">
                {settingsSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Settings
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bounty Applicants */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Applicants</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={applicantTab} onValueChange={(v) => setApplicantTab(v as typeof applicantTab)}>
            <TabsList className="mb-4">
              <TabsTrigger value="pending">
                Pending ({applicants.filter((a) => a.status === "pending").length})
              </TabsTrigger>
              <TabsTrigger value="approved">
                Approved ({applicants.filter((a) => a.status === "approved").length})
              </TabsTrigger>
              <TabsTrigger value="rejected">
                Rejected ({applicants.filter((a) => a.status === "rejected").length})
              </TabsTrigger>
            </TabsList>
            {(["pending", "approved", "rejected"] as const).map((tab) => (
              <TabsContent key={tab} value={tab}>
                {applicantsLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : applicants.filter((a) => a.status === tab).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No applicants here.</p>
                ) : (
                  <div className="space-y-2">
                    {applicants.filter((a) => a.status === tab).map((applicant) => {
                      const isReviewing = reviewingId === applicant.id;
                      const isUploadingW9 = w9UploadingId === applicant.id;
                      return (
                        <div key={applicant.id} className="border border-border rounded-lg px-4 py-3 space-y-2">
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div>
                              <p className="text-sm font-medium">{applicant.full_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {applicant.email}{applicant.phone ? ` · ${applicant.phone}` : ""}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {applicant.status === "pending" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs px-2"
                                    disabled={isReviewing}
                                    onClick={() => handleApproveApplicant(applicant)}
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs px-2 text-destructive"
                                    disabled={isReviewing}
                                    onClick={() => handleRejectApplicant(applicant)}
                                  >
                                    Reject
                                  </Button>
                                </>
                              )}
                              {applicant.status === "approved" && applicant.code && (
                                <>
                                  <span className="text-xs font-mono text-muted-foreground bg-muted/50 rounded px-2 py-1">
                                    {applicant.code}
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs px-2"
                                    disabled={sendingEmailId === applicant.id}
                                    onClick={() => handleSendApprovalEmail(applicant)}
                                  >
                                    {sendingEmailId === applicant.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                                    Send approval email
                                  </Button>
                                </>
                              )}
                              {isReviewing && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                            </div>
                          </div>
                          {applicant.relationship_note && (
                            <p className="text-xs text-muted-foreground">{applicant.relationship_note}</p>
                          )}
                          <div className="flex items-center gap-2">
                            <Label className="text-xs shrink-0">W9:</Label>
                            {applicant.w9_file_path ? (
                              <span className="text-xs text-green-700">Attached</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">Not attached</span>
                            )}
                            <label className="text-xs text-primary cursor-pointer hover:underline">
                              {isUploadingW9 ? "Uploading…" : applicant.w9_file_path ? "Replace" : "Attach"}
                              <input
                                type="file"
                                className="hidden"
                                disabled={isUploadingW9}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleW9Upload(applicant, file);
                                  e.target.value = "";
                                }}
                              />
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Referral Tracker */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base font-semibold">Referral Tracker</CardTitle>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add Referral
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 flex-wrap h-auto gap-1">
              <TabsTrigger value="all">All ({referrals.length})</TabsTrigger>
              {STATUS_OPTIONS.map((s) => (
                <TabsTrigger key={s} value={s}>
                  {STATUS_LABELS[s]} ({referrals.filter((r) => r.status === s).length})
                </TabsTrigger>
              ))}
            </TabsList>

            {["all", ...STATUS_OPTIONS].map((tab) => (
              <TabsContent key={tab} value={tab}>
                {referralsLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : filteredReferrals.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No referrals in this status.</p>
                ) : (
                  <div className="space-y-2">
                    {filteredReferrals.map((referral) => {
                      const isExpanded = expandedRow === referral.id;
                      const isUpdating = updatingRow === referral.id;
                      const status = referral.status as ReferralStatus;

                      return (
                        <div key={referral.id} className="border border-border rounded-lg overflow-hidden">
                          <div className="flex items-center gap-3 px-4 py-3 flex-wrap">
                            {/* Referrer */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium">
                                  {referral.referrer?.full_name ?? "—"}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {referral.referrer?.email ?? ""}
                                </span>
                                <span className="text-muted-foreground/40 text-xs">→</span>
                                <span className="text-sm">
                                  {referral.referred_name ?? referral.referred_client?.full_name ?? "—"}
                                </span>
                                <span className="text-xs text-muted-foreground">{referral.referred_email ?? ""}</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {format(new Date(referral.created_at), "MMM d, yyyy")}
                                {referral.payout_method && ` · ${PAYOUT_METHODS.find((m) => m.value === referral.payout_method)?.label ?? referral.payout_method}`}
                              </p>
                            </div>

                            {/* Badges + rewards */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {referral.first_reward_paid_at && (
                                <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0.5">
                                  <CheckCircle2 className="h-3 w-3" /> ${settings?.first_reward_amount.toFixed(2) ?? "—"}
                                </span>
                              )}
                              {referral.completion_bonus_paid_at && (
                                <span className="flex items-center gap-1 text-xs text-teal-700 bg-teal-50 border border-teal-200 rounded px-1.5 py-0.5">
                                  <CheckCircle2 className="h-3 w-3" /> +${settings?.completion_bonus_amount.toFixed(2) ?? "—"}
                                </span>
                              )}
                              <Badge className={`text-xs border ${STATUS_BADGE[status] ?? ""}`}>
                                {STATUS_LABELS[status] ?? referral.status}
                              </Badge>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Select
                                value={referral.status}
                                onValueChange={(v) => handleStatusChange(referral, v)}
                                disabled={isUpdating}
                              >
                                <SelectTrigger className="h-7 text-xs w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {STATUS_OPTIONS.map((s) => (
                                    <SelectItem key={s} value={s} className="text-xs">{STATUS_LABELS[s]}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              {canMarkFirstReward(referral) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs px-2"
                                  onClick={() => handleMarkFirstReward(referral)}
                                  disabled={isUpdating}
                                  title={`Mark $${settings?.first_reward_amount.toFixed(2)} reward as paid`}
                                >
                                  <DollarSign className="h-3 w-3 mr-1" /> Reward
                                </Button>
                              )}

                              {!referral.completion_bonus_paid_at && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs px-2"
                                  onClick={() => handleMarkBonus(referral)}
                                  disabled={isUpdating}
                                  title={`Mark $${settings?.completion_bonus_amount.toFixed(2)} bonus as paid`}
                                >
                                  <DollarSign className="h-3 w-3 mr-1" /> Bonus
                                </Button>
                              )}

                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => setExpandedRow(isExpanded ? null : referral.id)}
                                title="Edit notes"
                              >
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </Button>

                              {isUpdating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="border-t border-border bg-muted/30 px-4 py-3 space-y-2">
                              <Label className="text-xs">Notes</Label>
                              <Textarea
                                rows={3}
                                value={rowNotes[referral.id] ?? ""}
                                onChange={(e) => setRowNotes((n) => ({ ...n, [referral.id]: e.target.value }))}
                                placeholder="Add internal notes…"
                                className="text-sm"
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => handleSaveNotes(referral.id)}
                                disabled={savingNotes === referral.id}
                              >
                                {savingNotes === referral.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                                Save notes
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Add Referral Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md bg-white text-black" style={lightVars}>
          <DialogHeader>
            <DialogTitle className="text-black">Add Referral</DialogTitle>
            <DialogDescription className="text-black/50">
              Record a new referral manually. The referrer will earn{" "}
              ${settings?.first_reward_amount.toFixed(2) ?? "—"} when the referred client signs,
              and ${settings?.completion_bonus_amount.toFixed(2) ?? "—"} when their project goes live.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div>
              <Label className="text-black">Referrer</Label>
              <Select value={addForm.referrer_profile_id} onValueChange={(v) => setAddForm((f) => ({ ...f, referrer_profile_id: v }))}>
                <SelectTrigger className="bg-white text-black border-black/20">
                  <SelectValue placeholder="Select client…" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name}{p.email ? ` (${p.email})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-black">Referred name</Label>
              <Input
                value={addForm.referred_name}
                onChange={(e) => setAddForm((f) => ({ ...f, referred_name: e.target.value }))}
                placeholder="Full name"
                className="bg-white text-black border-black/20"
              />
            </div>

            <div>
              <Label className="text-black">Referred email</Label>
              <Input
                type="email"
                value={addForm.referred_email}
                onChange={(e) => setAddForm((f) => ({ ...f, referred_email: e.target.value }))}
                placeholder="email@example.com"
                className="bg-white text-black border-black/20"
              />
            </div>

            <div>
              <Label className="text-black">Payout method</Label>
              <Select value={addForm.payout_method} onValueChange={(v) => setAddForm((f) => ({ ...f, payout_method: v }))}>
                <SelectTrigger className="bg-white text-black border-black/20">
                  <SelectValue placeholder="Select method…" />
                </SelectTrigger>
                <SelectContent>
                  {PAYOUT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-black">Notes <span className="text-black/40 text-xs">(optional)</span></Label>
              <Textarea
                rows={3}
                value={addForm.notes}
                onChange={(e) => setAddForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Any context about this referral…"
                className="bg-white text-black border-black/20"
              />
            </div>

            <Button
              onClick={handleAddReferral}
              disabled={addSubmitting || !addForm.referrer_profile_id || !addForm.referred_name.trim() || !addForm.referred_email.trim()}
              className="w-full"
            >
              {addSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Add Referral
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
