import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Download, Loader2, MessageSquare, Send } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const PortalDocuments = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [thread, setThread] = useState<{ doc: any; messages: any[] } | null>(null);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    if (!user) return;
    const { data: p } = await supabase.from("client_profiles").select("id").eq("user_id", user.id).maybeSingle();
    setProfile(p);
    const filter = p?.id ? `client_profile_id.eq.${p.id},user_id.eq.${user.id}` : `user_id.eq.${user.id}`;
    const { data } = await supabase.from("client_documents").select("*").or(filter).order("created_at", { ascending: false });
    setDocuments(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

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

  const openThread = async (doc: any) => {
    if (!user) return;
    const { data } = await supabase.from("client_messages")
      .select("*").eq("document_id", doc.id).order("created_at", { ascending: true });
    setThread({ doc, messages: data || [] });
  };

  const sendMessage = async () => {
    if (!user || !profile || !thread || !newMsg.trim()) return;
    setSending(true);
    const { data, error } = await supabase.from("client_messages").insert({
      user_id: user.id,
      client_profile_id: profile.id,
      document_id: thread.doc.id,
      message: newMsg.trim().slice(0, 4000),
      sender: "client",
    }).select().single();
    setSending(false);
    if (error) { toast({ title: "Send failed", description: error.message, variant: "destructive" }); return; }
    setThread({ ...thread, messages: [...thread.messages, data] });
    setNewMsg("");
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-display tracking-wider mb-6">Documents</h1>
      {documents.length === 0 ? (
        <p className="text-muted-foreground text-sm">No documents have been shared with you yet.</p>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 p-4 rounded-lg border border-border/30 bg-card hover:border-primary/30 transition-colors">
              <FileText className="h-5 w-5 text-primary shrink-0" />
              <button onClick={() => handleDownload(doc)} disabled={downloadingId === doc.id} className="flex-1 min-w-0 text-left">
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
            <Button onClick={sendMessage} disabled={sending || !newMsg.trim()}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PortalDocuments;
