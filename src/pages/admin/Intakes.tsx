import { useEffect, useMemo, useState } from "react";
import { Loader2, Mail, Phone, Building2, ExternalLink, FileText, Trash2, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
};

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

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("client_intakes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    } else {
      setIntakes((data || []) as unknown as Intake[]);
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

  const sendInvoice = async (intake: Intake) => {
    setActionLoading(true);
    const { data, error } = await supabase.functions.invoke("send-consultation-invoice", {
      body: { email: intake.email, name: intake.full_name, intakeId: intake.id },
    });
    setActionLoading(false);
    if (error || !data?.success) {
      toast({ title: "Invoice failed", description: error?.message || data?.error || "Try again", variant: "destructive" });
      return;
    }
    toast({ title: "Invoice sent", description: `$50 invoice emailed to ${intake.email}` });
    await updateStatus(intake.id, "invoice_sent");
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
          Submissions from <code>/intake</code>. Review, then send a $50 invoice or waive the fee.
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
              </div>

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
                <Button
                  size="sm"
                  disabled={actionLoading || selected.status === "invoice_sent" || selected.status === "paid" || selected.status === "waived"}
                  onClick={() => sendInvoice(selected)}
                >
                  Send $50 Invoice
                </Button>
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
    </div>
  );
};

export default Intakes;
