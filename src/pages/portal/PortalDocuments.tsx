import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePortalClientProfile } from "@/hooks/usePortalClientProfile";
import { supabase } from "@/integrations/supabase/client";
import {
  FileText, Download, Loader2, MessageSquare, Send,
  CheckCircle, ChevronDown, ChevronUp, Printer,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DocumentViewer from "@/components/DocumentViewer";

const SLOT_LABELS: Record<string, string> = {
  site_audit: "Site Audit",
  market_research: "Market Research",
  service_tier: "Service Tier Information",
  plan: "Project Plan",
  agreement: "Proposal & Agreement",
};

const PortalDocuments = () => {
  const { user } = useAuth();
  const { profile: resolvedProfile, loading: profileLoading, isViewingAsAdmin } = usePortalClientProfile();
  const [documents, setDocuments] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [thread, setThread] = useState<{ doc: any; messages: any[] } | null>(null);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<any>(null);
  const [viewingDocUrl, setViewingDocUrl] = useState<string | null>(null);
  const { toast } = useToast();

  // Project Documents state
  const [docSlots, setDocSlots] = useState<any[]>([]);
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null);
  const [slotSignedUrls, setSlotSignedUrls] = useState<Record<string, string>>({});
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [agreementRecord, setAgreementRecord] = useState<any>(null);

  const load = async () => {
    if (!user || profileLoading) return;
    const p = resolvedProfile;
    setProfile(p);

    const profileId = p?.id;

    if (profileId) {
      // Fetch document slots
      const { data: slots } = await (supabase as any)
        .from("client_document_slots")
        .select("*")
        .eq("client_profile_id", profileId);
      setDocSlots(slots || []);

      // Fetch agreement record if exists
      const { data: agr } = await (supabase as any)
        .from("client_agreement_records")
        .select("*")
        .eq("client_profile_id", profileId)
        .maybeSingle();
      setAgreementRecord(agr);
    }
    setSlotsLoading(false);

    // Fetch shared documents
    const filter = profileId
      ? `client_profile_id.eq.${profileId},user_id.eq.${user.id}`
      : `user_id.eq.${user.id}`;
    const { data } = await supabase
      .from("client_documents")
      .select("*")
      .or(filter)
      .order("created_at", { ascending: false });
    setDocuments(data || []);
    setLoading(false);

    if (profileId) {
      (supabase as any)
        .from("client_portal_seen_at")
        .upsert(
          { client_profile_id: profileId, item_type: "documents", last_seen_at: new Date().toISOString() },
          { onConflict: "client_profile_id,item_type" },
        )
        .then(() => {});
    }
  };

  useEffect(() => { load(); }, [user, resolvedProfile, profileLoading]);

  // Expand/collapse a slot; generate signed URL on first expand for uploaded slots
  const handleExpandSlot = async (slot: any) => {
    if (expandedSlot === slot.id) {
      setExpandedSlot(null);
      return;
    }
    setExpandedSlot(slot.id);
    if (slot.storage_path && !slotSignedUrls[slot.id]) {
      const { data, error } = await supabase.storage
        .from("client-slot-docs")
        .createSignedUrl(slot.storage_path, 3600);
      if (!error && data?.signedUrl) {
        setSlotSignedUrls((prev) => ({ ...prev, [slot.id]: data.signedUrl }));
      } else {
        toast({ title: "Unable to load document preview", variant: "destructive" });
      }
    }
  };

  const handleDownload = async (doc: any) => {
    setDownloadingId(doc.id);
    try {
      let path: string = doc.file_url;
      const marker = "/client-documents/";
      const idx = path.indexOf(marker);
      if (idx !== -1) path = path.substring(idx + marker.length);
      // If parent_admin_doc_id exists, signed url is from admin-documents
      const bucket = doc.parent_admin_doc_id ? "admin-documents" : "client-documents";
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
      if (error || !data?.signedUrl) {
        toast({ title: "Unable to open document", variant: "destructive" });
        return;
      }
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } finally { setDownloadingId(null); }
  };

  const handleView = async (doc: any) => {
    setViewingDoc(doc);
    setViewingDocUrl(null);
    let path: string = doc.file_url;
    const marker = "/client-documents/";
    const idx = path.indexOf(marker);
    if (idx !== -1) path = path.substring(idx + marker.length);
    const bucket = doc.parent_admin_doc_id ? "admin-documents" : "client-documents";
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) {
      toast({ title: "Unable to open document", variant: "destructive" });
      setViewingDoc(null);
      return;
    }
    setViewingDocUrl(data.signedUrl);
  };

  const openThread = async (doc: any) => {
    if (!user) return;
    const { data } = await supabase
      .from("client_messages")
      .select("*")
      .eq("document_id", doc.id)
      .order("created_at", { ascending: true });
    setThread({ doc, messages: data || [] });
  };

  const sendMessage = async () => {
    if (!user || !profile || !thread || !newMsg.trim() || isViewingAsAdmin) return;
    setSending(true);
    const { data, error } = await supabase
      .from("client_messages")
      .insert({
        user_id: user.id,
        client_profile_id: profile.id,
        document_id: thread.doc.id,
        message: newMsg.trim().slice(0, 4000),
        sender: "client",
      })
      .select()
      .single();
    setSending(false);
    if (error) { toast({ title: "Send failed", description: error.message, variant: "destructive" }); return; }
    setThread({ ...thread, messages: [...thread.messages, data] });
    setNewMsg("");
  };

  // Hide slots where status === 'na'
  const visibleSlots = docSlots.filter((s) => s.status !== "na");

  // Block render until at least slot data is ready (documents can load after)
  if (loading && slotsLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-display tracking-wider mb-6">Documents</h1>

      {/* ── Project Documents ── */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Project Documents</h2>

        {slotsLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-white/50" />
          </div>
        ) : visibleSlots.length === 0 ? (
          <p className="text-white/70 text-sm">No project documents have been prepared yet.</p>
        ) : (
          <div className="space-y-3">
            {visibleSlots.map((slot) => {
              const label = SLOT_LABELS[slot.slot_type] || slot.slot_type;
              const isExpanded = expandedSlot === slot.id;
              const signedUrl = slotSignedUrls[slot.id];
              const isAgreement = slot.slot_type === "agreement";

              // ── Agreement slot ──
              if (isAgreement) {
                const agreementStatus = slot.status as string;
                return (
                  <div key={slot.id} className="border border-white/10 rounded-lg overflow-hidden">
                    <div className="flex items-center gap-3 p-4 flex-wrap">
                      <FileText className="h-5 w-5 text-white/50 shrink-0" />
                      <span className="flex-1 text-sm font-medium text-white">{label}</span>

                      {(agreementStatus === 'pending' || agreementStatus === 'in_progress') && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/10 text-white/50 border border-white/10">
                          Pending
                        </span>
                      )}
                      {agreementStatus === 'in_preparation' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Being Prepared
                        </span>
                      )}
                      {agreementStatus === 'awaiting_signature' && (
                        <>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            Ready for Your Signature
                          </span>
                          {slot.storage_path && (
                            <Button size="sm" variant="ghost" className="text-white/70 hover:text-white" onClick={() => handleExpandSlot(slot)}>
                              View
                              {isExpanded ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                            </Button>
                          )}
                        </>
                      )}
                      {(agreementStatus === 'completed' || agreementStatus === 'uploaded') && (
                        <>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                            <CheckCircle className="h-3 w-3" /> Signed ✓
                          </span>
                          {slot.storage_path && (
                            <Button size="sm" variant="ghost" className="text-white/70 hover:text-white" onClick={() => handleExpandSlot(slot)}>
                              View
                              {isExpanded ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                            </Button>
                          )}
                        </>
                      )}
                    </div>

                    {/* Expanded — show the uploaded proposal PDF */}
                    {isExpanded && slot.storage_path && (
                      <div className="border-t border-white/10 p-4">
                        <DocumentViewer url={signedUrl || null} fileName={slot.file_name || ""} />
                      </div>
                    )}
                  </div>
                );
              }

              // ── Standard (non-agreement) slots ──
              return (
                <div key={slot.id} className="border border-white/10 rounded-lg overflow-hidden">
                  <div className="flex items-center gap-3 p-4 flex-wrap">
                    <FileText className="h-5 w-5 text-white/50 shrink-0" />
                    <span className="flex-1 text-sm font-medium text-white">{label}</span>

                    {slot.status === "pending" && (
                      <>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/10 text-white/50 border border-white/10">
                          Pending
                        </span>
                        <span className="text-xs text-white/40">Document not yet started</span>
                      </>
                    )}

                    {slot.status === "in_progress" && (
                      <>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          In Progress
                        </span>
                        <span className="text-xs text-white/40 italic">In progress — check back soon</span>
                      </>
                    )}

                    {slot.status === "uploaded" && (
                      <>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                          <CheckCircle className="h-3 w-3" /> Ready
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-white/70 hover:text-white"
                          onClick={() => handleExpandSlot(slot)}
                        >
                          {isExpanded
                            ? <><ChevronUp className="h-3 w-3 mr-1" /> Hide</>
                            : <><ChevronDown className="h-3 w-3 mr-1" /> View</>}
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Embedded viewer for uploaded slots */}
                  {isExpanded && slot.status === "uploaded" && (
                    <div className="border-t border-white/10 p-4 bg-white/5">
                      <DocumentViewer url={signedUrl || null} fileName={slot.file_name || label} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Existing shared documents ── */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : documents.length === 0 ? (
        <p className="text-muted-foreground text-sm">No documents have been shared with you yet.</p>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 p-4 rounded-lg border border-border/30 bg-card hover:border-primary/30 transition-colors">
              <FileText className="h-5 w-5 text-primary shrink-0" />
              <button onClick={() => handleView(doc)} className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium truncate">{doc.title}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(doc.created_at), "MMM d, yyyy")} • Uploaded by {doc.uploaded_by}
                </p>
                {doc.note && <p className="text-xs text-muted-foreground italic mt-1 line-clamp-2">"{doc.note}"</p>}
              </button>
              <Button variant="ghost" size="sm" onClick={() => openThread(doc)} title="Message about this document">
                <MessageSquare className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleDownload(doc)} disabled={downloadingId === doc.id}>
                {downloadingId === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!viewingDoc} onOpenChange={(open) => { if (!open) { setViewingDoc(null); setViewingDocUrl(null); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{viewingDoc?.title}</DialogTitle></DialogHeader>
          {viewingDoc && (
            <DocumentViewer url={viewingDocUrl} fileName={viewingDoc.file_url} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!thread} onOpenChange={(o) => !o && setThread(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="truncate">Re: {thread?.doc.title}</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-72 overflow-y-auto py-2">
            {thread?.messages.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No messages yet — start the conversation about this document.</p>}
            {thread?.messages.map((m) => (
              <div key={m.id} className={`p-3 rounded-lg text-sm ${m.sender === "admin" ? "bg-primary/10" : "bg-muted/50"}`}>
                <p className="text-xs text-muted-foreground mb-1">{m.sender === "admin" ? "Aethyx" : "You"} • {format(new Date(m.created_at), "MMM d, h:mm a")}</p>
                <p className="whitespace-pre-wrap">{m.message}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-2 border-t">
            <Textarea rows={2} value={newMsg} onChange={(e) => setNewMsg(e.target.value)} placeholder="Type your message…" />
            <Button onClick={sendMessage} disabled={isViewingAsAdmin || sending || !newMsg.trim()}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PortalDocuments;
