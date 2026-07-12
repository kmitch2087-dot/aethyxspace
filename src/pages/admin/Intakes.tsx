import { useEffect, useMemo, useState } from "react";
import { Loader2, Mail, Phone, Building2, ExternalLink, FileText, Trash2, Gift, CalendarClock, Video, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";

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

type IntakeStatus = "new" | "reviewing" | "invoice_sent" | "paid" | "waived" | "archived";

type Intake = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  business_name: string | null;
  responses: Record<string, { label: string; section: string; value: string }>;
  status: IntakeStatus;
  linked_user_id: string | null;
  notes: string | null;
  created_at: string;
  referral_code: string | null;
  meeting_scheduled_at: string | null;
  meeting_type: "phone" | "google_meet" | null;
  meeting_link: string | null;
  meeting_reschedule_used: boolean;
  consultation_paid_at: string | null;
};

const MEETING_TYPE_LABEL = { phone: "Phone call", google_meet: "Google Meet" } as const;

const formatMeetingTime = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    timeZone: "America/New_York",
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  }) + " ET";

const STATUS_LABEL: Record<IntakeStatus, string> = {
  new: "New",
  reviewing: "Reviewing",
  invoice_sent: "Invoice Sent",
  paid: "Paid",
  waived: "Fee Waived",
  archived: "Archived",
};

const STATUS_TONE: Record<IntakeStatus, string> = {
  new: "bg-blue-100 text-blue-800",
  reviewing: "bg-yellow-100 text-yellow-800",
  invoice_sent: "bg-purple-100 text-purple-800",
  paid: "bg-green-100 text-green-800",
  waived: "bg-teal-100 text-teal-800",
  archived: "bg-gray-100 text-gray-700",
};

const Intakes = () => {
  const { toast } = useToast();
  const [intakes, setIntakes] = useState<Intake[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<IntakeStatus | "all">("all");
  const [selected, setSelected] = useState<Intake | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [referrerNames, setReferrerNames] = useState<Record<string, string>>({});
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [meetingType, setMeetingType] = useState<"phone" | "google_meet">("google_meet");
  const [meetingLink, setMeetingLink] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("client_intakes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const rows = (data || []) as unknown as Intake[];
    setIntakes(rows);

    const codes = Array.from(new Set(rows.map((r) => r.referral_code).filter(Boolean))) as string[];
    if (codes.length > 0) {
      const { data: links } = await supabase
        .from("referral_links")
        .select("code, client_profile_id")
        .in("code", codes);
      const profileIds = Array.from(new Set((links || []).map((l) => l.client_profile_id)));
      if (profileIds.length > 0) {
        const { data: profiles } = await supabase
          .from("client_profiles")
          .select("id, full_name")
          .in("id", profileIds);
        const profileNameById: Record<string, string> = {};
        (profiles || []).forEach((p) => { profileNameById[p.id] = p.full_name; });
        const nameByCode: Record<string, string> = {};
        (links || []).forEach((l) => {
          const name = profileNameById[l.client_profile_id];
          if (name) nameByCode[l.code] = name;
        });
        setReferrerNames(nameByCode);
      }
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => (filter === "all" ? intakes : intakes.filter((i) => i.status === filter)),
    [intakes, filter],
  );

  const updateStatus = async (id: string, status: IntakeStatus) => {
    setActionLoading(true);
    const { error } = await supabase.from("client_intakes").update({ status }).eq("id", id);
    setActionLoading(false);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Marked as ${STATUS_LABEL[status]}` });
    setIntakes((s) => s.map((i) => (i.id === id ? { ...i, status } : i)));
    setSelected((s) => (s && s.id === id ? { ...s, status } : s));
  };

  const deleteIntake = async (id: string) => {
    setActionLoading(true);
    const { error } = await supabase.from("client_intakes").delete().eq("id", id);
    setActionLoading(false);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Intake deleted" });
    setIntakes((s) => s.filter((i) => i.id !== id));
    setSelected(null);
    setConfirmDelete(false);
  };

  const openSchedule = (intake: Intake) => {
    const preferred = Object.values(intake.responses || {}).find((r) =>
      r.label.toLowerCase().includes("how would you like to meet"),
    )?.value;
    setMeetingType(
      intake.meeting_type ||
        (preferred === "Google Meet" ? "google_meet" : preferred === "Phone call" ? "phone" : "google_meet"),
    );
    if (intake.meeting_scheduled_at) {
      const d = new Date(intake.meeting_scheduled_at);
      setMeetingDate(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      );
      setMeetingTime(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
    } else {
      setMeetingDate("");
      setMeetingTime("");
    }
    setMeetingLink(intake.meeting_link || "");
    setScheduleOpen(true);
  };

  const gcalDraftUrl = (intake: Intake) => {
    const base = "https://calendar.google.com/calendar/render?action=TEMPLATE";
    const text = encodeURIComponent(`Aethyx Consultation — ${intake.full_name}`);
    let dates = "";
    if (meetingDate && meetingTime) {
      const start = new Date(`${meetingDate}T${meetingTime}`);
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
      dates = `&dates=${stamp(start)}/${stamp(end)}`;
    }
    return `${base}&text=${text}${dates}&add=${encodeURIComponent(intake.email)}`;
  };

  const scheduleMeeting = async (intake: Intake) => {
    if (!meetingDate || !meetingTime) {
      toast({ title: "Pick a date and time", variant: "destructive" });
      return;
    }
    const start = new Date(`${meetingDate}T${meetingTime}`);
    if (isNaN(start.getTime()) || start.getTime() < Date.now()) {
      toast({ title: "Meeting time must be in the future", variant: "destructive" });
      return;
    }
    const isReschedule = !!intake.meeting_scheduled_at;
    setActionLoading(true);
    const { data, error } = await supabase.functions.invoke("schedule-consultation", {
      body: {
        intakeId: intake.id,
        scheduledAt: start.toISOString(),
        meetingType,
        meetingLink: meetingType === "google_meet" ? meetingLink.trim() : "",
        isReschedule,
      },
    });
    setActionLoading(false);
    if (error || !data?.success) {
      toast({ title: "Scheduling failed", description: error?.message || data?.error || "Try again", variant: "destructive" });
      return;
    }
    toast({
      title: isReschedule ? "Meeting rescheduled" : "Meeting scheduled",
      description: data.emailSent
        ? `Confirmation${isReschedule ? "" : " + $50 invoice"} emailed to ${intake.email}${
            data.calendarAdded ? " · added to your Google Calendar" : ""
          }`
        : "Saved, but the email failed to send — resend from the Inbox.",
    });
    setScheduleOpen(false);
    await load();
    setSelected((s) =>
      s && s.id === intake.id
        ? {
            ...s,
            meeting_scheduled_at: start.toISOString(),
            meeting_type: meetingType,
            meeting_link: meetingType === "google_meet" ? meetingLink.trim() || null : null,
            meeting_reschedule_used: s.meeting_reschedule_used || isReschedule,
            status: s.status === "new" || s.status === "reviewing" ? "invoice_sent" : s.status,
          }
        : s,
    );
  };

  const waiveFee = async (intake: Intake) => {
    setActionLoading(true);
    const firstName = intake.full_name?.split(" ")[0] || "";
    const { error } = await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "fee-waived",
        recipientEmail: intake.email,
        idempotencyKey: `fee-waived-${intake.id}`,
        templateData: { firstName, originalAmount: "50.00", discountLabel: "Friends & family" },
      },
    });
    setActionLoading(false);
    if (error) {
      toast({ title: "Email failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Fee waived", description: `Waiver email sent to ${intake.email}` });
    await updateStatus(intake.id, "waived");
  };

  const groupedResponses = useMemo(() => {
    if (!selected) return {} as Record<string, Array<{ label: string; value: string }>>;
    const out: Record<string, Array<{ label: string; value: string }>> = {
      about: [], project: [], market: [], extra: [],
    };
    for (const r of Object.values(selected.responses || {})) {
      (out[r.section] ||= []).push({ label: r.label, value: r.value });
    }
    return out;
  }, [selected]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Client Intakes</h1>
        <p className="text-sm text-black/60 mt-1">
          Submissions from <code>/intake</code>. Review, then schedule the consultation (sends the $50 invoice) or waive the fee.
        </p>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as IntakeStatus | "all")}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="new">New</TabsTrigger>
          <TabsTrigger value="reviewing">Reviewing</TabsTrigger>
          <TabsTrigger value="invoice_sent">Invoice Sent</TabsTrigger>
          <TabsTrigger value="paid">Paid</TabsTrigger>
          <TabsTrigger value="waived">Fee Waived</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-black/50 border border-dashed border-black/10 rounded-xl">
          <FileText className="h-8 w-8 mx-auto mb-3 opacity-50" />
          No intakes here yet.
        </div>
      ) : (
        <div className="border border-black/10 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-black/5 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Business</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Received</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => (
                <tr key={i.id} className="border-t border-black/10 hover:bg-black/[0.02]">
                  <td className="px-4 py-3 font-medium">{i.full_name}</td>
                  <td className="px-4 py-3 text-black/70">{i.business_name || "—"}</td>
                  <td className="px-4 py-3 text-black/70">{i.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_TONE[i.status]}`}>
                      {STATUS_LABEL[i.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-black/60">
                    {new Date(i.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="outline" size="sm" onClick={() => setSelected(i)}>
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Sheet open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); setConfirmDelete(false); } }}>
        <SheetContent
          className="w-full sm:max-w-2xl overflow-y-auto bg-white text-black"
          style={lightVars}
        >
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="font-display text-2xl text-black">{selected.full_name}</SheetTitle>
                <SheetDescription className="text-black/50">
                  Submitted {new Date(selected.created_at).toLocaleString()}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-black/70">
                  <Mail className="h-4 w-4" /> {selected.email}
                </div>
                {selected.phone && (
                  <div className="flex items-center gap-2 text-black/70">
                    <Phone className="h-4 w-4" /> {selected.phone}
                  </div>
                )}
                {selected.business_name && (
                  <div className="flex items-center gap-2 text-black/70">
                    <Building2 className="h-4 w-4" /> {selected.business_name}
                  </div>
                )}
                <div>
                  <Badge className={STATUS_TONE[selected.status]}>
                    {STATUS_LABEL[selected.status]}
                  </Badge>
                </div>
                {selected.referral_code && referrerNames[selected.referral_code] && (
                  <div className="flex items-center gap-2 text-black/70">
                    <Gift className="h-4 w-4" /> Referred by {referrerNames[selected.referral_code]}
                  </div>
                )}
              </div>

              {selected.meeting_scheduled_at && (
                <div className="mt-4 rounded-lg border border-black/10 bg-black/[0.03] px-4 py-3 text-sm space-y-1">
                  <div className="flex items-center gap-2 font-medium text-black">
                    <CalendarClock className="h-4 w-4" />
                    {formatMeetingTime(selected.meeting_scheduled_at)}
                    <span className="text-black/50 font-normal">
                      · {MEETING_TYPE_LABEL[selected.meeting_type || "phone"]}
                    </span>
                  </div>
                  {selected.meeting_link && (
                    <a
                      href={selected.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-teal-700 hover:underline"
                    >
                      <Video className="h-4 w-4" /> {selected.meeting_link}
                    </a>
                  )}
                  <div className="text-xs text-black/50">
                    {selected.consultation_paid_at || selected.status === "paid"
                      ? "✓ Consultation fee paid"
                      : selected.status === "waived"
                        ? "Fee waived"
                        : "Awaiting $50 payment"}
                    {selected.meeting_reschedule_used && " · reschedule used"}
                  </div>
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={actionLoading || selected.status === "reviewing"}
                  onClick={() => updateStatus(selected.id, "reviewing")}
                  className="border-black/20 text-black hover:bg-black/5"
                >
                  Mark Reviewing
                </Button>
                {!selected.meeting_scheduled_at ? (
                  <Button size="sm" disabled={actionLoading} onClick={() => openSchedule(selected)}>
                    <CalendarClock className="h-3.5 w-3.5 mr-1.5" />
                    Schedule Meeting
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionLoading || selected.meeting_reschedule_used}
                    onClick={() => openSchedule(selected)}
                    className="border-black/20 text-black hover:bg-black/5"
                    title={selected.meeting_reschedule_used ? "The one included reschedule has been used" : undefined}
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    {selected.meeting_reschedule_used ? "Reschedule Used" : "Reschedule"}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={actionLoading || selected.status === "paid" || selected.status === "waived" || selected.status === "invoice_sent"}
                  onClick={() => waiveFee(selected)}
                  className="border-teal-300 text-teal-700 hover:bg-teal-50"
                >
                  <Gift className="h-3.5 w-3.5 mr-1.5" />
                  Waive Fee
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={actionLoading || selected.status === "paid"}
                  onClick={() => updateStatus(selected.id, "paid")}
                  className="border-black/20 text-black hover:bg-black/5"
                >
                  Mark Paid
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={actionLoading}
                  onClick={() => updateStatus(selected.id, "archived")}
                  className="text-black/50 hover:text-black"
                >
                  Archive
                </Button>
                {!confirmDelete ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={actionLoading}
                    className="text-red-500 hover:text-red-700 ml-auto"
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                  </Button>
                ) : (
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-xs text-red-600">Permanently delete?</span>
                    <Button size="sm" variant="destructive" disabled={actionLoading} onClick={() => deleteIntake(selected.id)}>
                      Yes, delete
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)} className="text-black">
                      Cancel
                    </Button>
                  </div>
                )}
              </div>

              <div className="mt-8 space-y-6">
                {(["about", "project", "market", "extra"] as const).map((section) => {
                  const items = groupedResponses[section] || [];
                  if (!items.length) return null;
                  return (
                    <div key={section}>
                      <h3 className="font-display text-lg tracking-tight mb-3 capitalize text-black">
                        {section === "extra" ? "Anything else" : `The ${section}`}
                      </h3>
                      <dl className="space-y-3">
                        {items.map((it, idx) => (
                          <div key={idx} className="border-l-2 border-black/10 pl-4">
                            <dt className="text-xs uppercase tracking-wider text-black/50">
                              {it.label}
                            </dt>
                            <dd className="text-sm text-black/80 whitespace-pre-wrap mt-1">
                              {it.value || <span className="italic text-black/40">— blank —</span>}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  );
                })}
              </div>

              {selected.linked_user_id && (
                <div className="mt-6 text-xs text-black/50 flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" /> Linked to portal account
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="bg-white text-black sm:max-w-md" style={lightVars}>
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-black">
                  {selected.meeting_scheduled_at ? "Reschedule consultation" : "Schedule consultation"}
                </DialogTitle>
                <DialogDescription className="text-black/50">
                  {selected.meeting_scheduled_at
                    ? "Sends an updated confirmation email. This uses their one included reschedule."
                    : `Sends ${selected.full_name.split(" ")[0]} a confirmation email with the meeting details${
                        selected.status === "waived" || selected.status === "paid" ? "" : " and the $50 invoice"
                      }.`}
                </DialogDescription>
              </DialogHeader>

              {(() => {
                const preferred = Object.values(selected.responses || {}).find((r) =>
                  r.label.toLowerCase().includes("how would you like to meet"),
                )?.value;
                const windows = Object.values(selected.responses || {}).find((r) =>
                  r.label.toLowerCase().includes("best days and times"),
                )?.value;
                return (preferred || windows) ? (
                  <div className="rounded-md bg-black/[0.04] px-3 py-2 text-xs text-black/60 space-y-0.5">
                    {preferred && <p>Prefers: <span className="font-medium text-black/80">{preferred}</span></p>}
                    {windows && <p>Their availability: <span className="font-medium text-black/80">{windows}</span></p>}
                  </div>
                ) : null;
              })()}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="meeting_date" className="text-black">Date</Label>
                  <Input id="meeting_date" type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} className="bg-white text-black" />
                </div>
                <div>
                  <Label htmlFor="meeting_time" className="text-black">Time (your local time)</Label>
                  <Input id="meeting_time" type="time" value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} className="bg-white text-black" />
                </div>
              </div>

              <div>
                <Label className="text-black">Meeting type</Label>
                <Select value={meetingType} onValueChange={(v) => setMeetingType(v as "phone" | "google_meet")}>
                  <SelectTrigger className="bg-white text-black">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="google_meet">Google Meet</SelectItem>
                    <SelectItem value="phone">Phone call</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {meetingType === "google_meet" && (
                <div>
                  <Label htmlFor="meeting_link" className="text-black">
                    Google Meet link <span className="text-black/40 font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="meeting_link"
                    type="url"
                    placeholder="Leave blank to auto-create"
                    value={meetingLink}
                    onChange={(e) => setMeetingLink(e.target.value)}
                    className="bg-white text-black"
                  />
                  <p className="text-xs text-black/50 mt-1.5">
                    Left blank, the event is added to your Google Calendar with a Meet link
                    auto-created and the client invited. Or{" "}
                    <a
                      href={gcalDraftUrl(selected)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal-700 underline"
                    >
                      create the event manually
                    </a>{" "}
                    and paste its Meet link here.
                  </p>
                </div>
              )}

              {selected.meeting_scheduled_at &&
                new Date(selected.meeting_scheduled_at).getTime() - Date.now() < 4 * 60 * 60 * 1000 && (
                  <p className="text-xs text-amber-700 bg-amber-50 rounded-md px-3 py-2">
                    Heads up: this is inside the 4-hour reschedule window. Allowing it is your call.
                  </p>
                )}

              <DialogFooter>
                <Button variant="ghost" onClick={() => setScheduleOpen(false)} className="text-black">
                  Cancel
                </Button>
                <Button disabled={actionLoading} onClick={() => scheduleMeeting(selected)}>
                  {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {selected.meeting_scheduled_at ? "Reschedule & Email" : "Schedule & Email"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Intakes;
