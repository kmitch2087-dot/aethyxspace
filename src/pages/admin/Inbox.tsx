import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Send, Loader2, Inbox as InboxIcon, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { ToastAction } from "@/components/ui/toast";
import { format } from "date-fns";

interface ThreadClient {
  id: string;
  full_name: string;
  user_id: string;
}

interface Message {
  id: string;
  client_profile_id: string;
  sender: string;
  message: string;
  created_at: string;
}

interface SentEmail {
  id: string;
  message_id: string | null;
  template_name: string;
  recipient_email: string;
  status: string;
  metadata: { batch_id?: string } | null;
  created_at: string;
}

interface SentGroup {
  key: string;
  templateName: string;
  createdAt: string;
  emails: SentEmail[];
}

const Inbox = () => {
  const { toast } = useToast();
  const [clients, setClients] = useState<ThreadClient[]>([]);
  const [messagesByClient, setMessagesByClient] = useState<Record<string, Message[]>>({});
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [sentLoading, setSentLoading] = useState(true);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: msgData } = await supabase
      .from("client_messages")
      .select("id, client_profile_id, sender, message, created_at")
      .not("client_profile_id", "is", null)
      .order("created_at", { ascending: false });
    const rows = (msgData || []) as Message[];

    const grouped: Record<string, Message[]> = {};
    for (const row of rows) {
      if (!grouped[row.client_profile_id]) grouped[row.client_profile_id] = [];
      grouped[row.client_profile_id].push(row);
    }
    setMessagesByClient(grouped);

    const clientIds = Object.keys(grouped);
    if (clientIds.length === 0) {
      setClients([]);
      setLoading(false);
      return;
    }
    const { data: profileData } = await supabase
      .from("client_profiles")
      .select("id, full_name, user_id")
      .in("id", clientIds);
    // Sort clients by their most recent message, newest thread first.
    const sorted = ((profileData as ThreadClient[]) || []).sort((a, b) => {
      const aLatest = grouped[a.id]?.[0]?.created_at || "";
      const bLatest = grouped[b.id]?.[0]?.created_at || "";
      return bLatest.localeCompare(aLatest);
    });
    setClients(sorted);
    if (!selectedClientId && sorted.length > 0) setSelectedClientId(sorted[0].id);
    setLoading(false);
  };

  const loadSent = async () => {
    setSentLoading(true);
    const { data } = await supabase
      .from("email_send_log")
      .select("id, message_id, template_name, recipient_email, status, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    setSentEmails((data || []) as SentEmail[]);
    setSentLoading(false);
  };

  useEffect(() => {
    load();
    loadSent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedClient = clients.find((c) => c.id === selectedClientId) || null;
  const threadMessages = selectedClientId
    ? [...(messagesByClient[selectedClientId] || [])].reverse()
    : [];

  const needsReply = (clientId: string) => messagesByClient[clientId]?.[0]?.sender === "client";

  const sentGroups: SentGroup[] = (() => {
    const byKey: Record<string, SentEmail[]> = {};
    for (const email of sentEmails) {
      const key = email.metadata?.batch_id || email.id;
      if (!byKey[key]) byKey[key] = [];
      byKey[key].push(email);
    }
    return Object.entries(byKey).map(([key, emails]) => ({
      key,
      templateName: emails[0].template_name,
      createdAt: emails[0].created_at,
      emails,
    }));
  })();

  // Sent-email viewer + forward. Content comes from email-actions (cached in
  // email_send_log or fetched from Resend by message_id for older sends).
  const [viewerEmail, setViewerEmail] = useState<SentEmail | null>(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerSubject, setViewerSubject] = useState("");
  const [viewerHtml, setViewerHtml] = useState<string | null>(null);
  const [forwardTo, setForwardTo] = useState("");
  const [forwarding, setForwarding] = useState(false);

  const openEmail = async (email: SentEmail) => {
    setViewerEmail(email);
    setViewerLoading(true);
    setViewerHtml(null);
    setViewerSubject("");
    setForwardTo("");
    const { data, error } = await supabase.functions.invoke("email-actions", {
      body: { action: "get", logId: email.id },
    });
    setViewerLoading(false);
    if (error || !data?.ok) {
      toast({ title: "Could not load email", description: data?.error || error?.message, variant: "destructive" });
      return;
    }
    setViewerSubject(data.subject);
    setViewerHtml(data.html);
  };

  const handleForward = async () => {
    if (!viewerEmail || !forwardTo.trim()) return;
    setForwarding(true);
    const { data, error } = await supabase.functions.invoke("email-actions", {
      body: { action: "forward", logId: viewerEmail.id, recipientEmail: forwardTo.trim() },
    });
    setForwarding(false);
    if (error || !data?.ok) {
      toast({ title: "Forward failed", description: data?.error || error?.message, variant: "destructive" });
      return;
    }
    toast({ title: `Forwarded to ${forwardTo.trim()}` });
    setForwardTo("");
    loadSent();
  };

  const [composeOpen, setComposeOpen] = useState(false);
  const [composeClients, setComposeClients] = useState<{ id: string; full_name: string; first_name: string | null; email: string | null }[]>([]);
  const [composeSelectedIds, setComposeSelectedIds] = useState<string[]>([]);
  const [composeSubject, setComposeSubject] = useState("");
  const [composeMessage, setComposeMessage] = useState("");
  const [composeSending, setComposeSending] = useState(false);

  // AI polish for the compose draft — replaces the draft with a brand-voice
  // rewrite; the toast's Undo restores the original.
  const [polishing, setPolishing] = useState(false);
  const handlePolish = async () => {
    if (!composeMessage.trim()) return;
    setPolishing(true);
    const prevSubject = composeSubject;
    const prevMessage = composeMessage;
    const { data, error } = await supabase.functions.invoke("polish-email", {
      body: { subject: composeSubject, message: composeMessage },
    });
    setPolishing(false);
    if (error || !data?.ok) {
      toast({ title: "Polish failed", description: data?.error || error?.message, variant: "destructive" });
      return;
    }
    setComposeSubject(data.subject);
    setComposeMessage(data.message);
    toast({
      title: "Draft polished ✨",
      description: "Review it before sending.",
      action: (
        <ToastAction altText="Undo" onClick={() => { setComposeSubject(prevSubject); setComposeMessage(prevMessage); }}>
          Undo
        </ToastAction>
      ),
    });
  };


  const openCompose = async () => {
    setComposeOpen(true);
    setComposeSelectedIds([]);
    setComposeSubject("");
    setComposeMessage("");
    const { data } = await supabase
      .from("client_profiles")
      .select("id, full_name, first_name, email")
      .order("full_name");
    setComposeClients((data || []) as typeof composeClients);
  };

  const sendCompose = async () => {
    if (composeSelectedIds.length === 0 || !composeSubject.trim() || !composeMessage.trim()) return;
    setComposeSending(true);
    const batchId = crypto.randomUUID();
    const targets = composeClients.filter((c) => composeSelectedIds.includes(c.id) && c.email);
    let successCount = 0;
    for (const target of targets) {
      const { data, error } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "admin-compose",
          recipientEmail: target.email,
          templateData: { firstName: target.first_name || "", subject: composeSubject.trim(), message: composeMessage.trim() },
          metadata: { batch_id: batchId },
        },
      });
      if (!error && data?.success !== false) successCount++;
    }
    setComposeSending(false);
    if (successCount === 0) {
      toast({ title: "Send failed", description: "No emails were sent — check the recipients and try again.", variant: "destructive" });
      return;
    }
    toast({ title: `Sent to ${successCount} of ${targets.length} client(s)` });
    setComposeOpen(false);
    loadSent();
  };

  const sendReply = async () => {
    if (!selectedClient || !reply.trim()) return;
    setSending(true);
    const { error } = await supabase.from("client_messages").insert({
      user_id: selectedClient.user_id,
      client_profile_id: selectedClient.id,
      sender: "admin",
      message: reply.trim(),
    });
    setSending(false);
    if (error) {
      toast({ title: "Failed to send", description: error.message, variant: "destructive" });
      return;
    }
    setReply("");
    load();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-display tracking-wider flex items-center gap-2">
          <InboxIcon className="h-6 w-6 text-primary" /> Inbox
        </h1>
        <Button size="sm" onClick={openCompose}>
          <Send className="h-4 w-4 mr-2" /> Compose email
        </Button>
      </div>

      <Tabs defaultValue="messages">
        <TabsList className="mb-4">
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="sent">Sent</TabsTrigger>
        </TabsList>

        <TabsContent value="messages">
      {clients.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No client messages yet.</p>
      ) : (
        <div className="grid md:grid-cols-[280px_1fr] gap-4">
          <div className="space-y-1">
            {clients.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedClientId(c.id)}
                className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                  selectedClientId === c.id ? "bg-primary/10 border-primary/30" : "border-border/30 hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate">{c.full_name}</span>
                  {needsReply(c.id) && <Badge className="text-xs shrink-0">Reply needed</Badge>}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {messagesByClient[c.id]?.[0]?.message}
                </p>
              </button>
            ))}
          </div>

          <div>
            {selectedClient ? (
              <>
                <h2 className="text-sm font-medium text-muted-foreground mb-3">{selectedClient.full_name}</h2>
                <div className="space-y-3 mb-4 max-h-[50vh] overflow-y-auto">
                  {threadMessages.map((m) => (
                    <div key={m.id} className={`flex ${m.sender === "admin" ? "justify-end" : "justify-start"}`}>
                      <Card className={`max-w-[80%] ${m.sender === "admin" ? "bg-primary/5 border-primary/20" : ""}`}>
                        <CardContent className="pt-4">
                          <p className="text-sm whitespace-pre-wrap">{m.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {m.sender === "admin" ? "You" : selectedClient.full_name} ·{" "}
                            {format(new Date(m.created_at), "MMM d, yyyy h:mm a")}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 items-end">
                  <Textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder={`Reply to ${selectedClient.full_name}…`}
                    className="min-h-[80px] max-h-40"
                    maxLength={2000}
                  />
                  <Button onClick={sendReply} disabled={sending || !reply.trim()}>
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Select a conversation.</p>
            )}
          </div>
        </div>
      )}
        </TabsContent>

        <TabsContent value="sent">
          {sentLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : sentGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No emails sent yet.</p>
          ) : (
            <div className="space-y-2">
              {sentGroups.map((group) => {
                const isExpanded = expandedGroup === group.key;
                const isBatch = group.emails.length > 1;
                return (
                  <Card key={group.key}>
                    <CardContent
                      className="pt-4 flex items-center justify-between gap-3 cursor-pointer"
                      onClick={() => (isBatch ? setExpandedGroup(isExpanded ? null : group.key) : openEmail(group.emails[0]))}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{group.templateName}</p>
                        <p className="text-xs text-muted-foreground">
                          {isBatch ? `Sent to ${group.emails.length} clients` : group.emails[0].recipient_email} ·{" "}
                          {format(new Date(group.createdAt), "MMM d, yyyy h:mm a")}
                        </p>
                      </div>
                      {isBatch && (isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />)}
                    </CardContent>
                    {isBatch && isExpanded && (
                      <div className="border-t border-border/30 px-4 py-2 space-y-1">
                        {group.emails.map((email) => (
                          <div
                            key={email.id}
                            className="flex items-center justify-between text-xs cursor-pointer hover:bg-muted/30 rounded px-1 py-0.5"
                            onClick={() => openEmail(email)}
                          >
                            <span className="text-muted-foreground">{email.recipient_email}</span>
                            <Badge variant={email.status === "sent" ? "default" : "destructive"} className="text-xs capitalize">
                              {email.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Sent email viewer + forward */}
      <Dialog open={!!viewerEmail} onOpenChange={(v) => { if (!v) setViewerEmail(null); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="pr-6 truncate">{viewerSubject || viewerEmail?.template_name || "Email"}</DialogTitle>
          </DialogHeader>
          {viewerEmail && (
            <div className="space-y-4">
              <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                <span>To: <span className="text-foreground">{viewerEmail.recipient_email}</span></span>
                <span>{format(new Date(viewerEmail.created_at), "MMM d, yyyy h:mm a")}</span>
                <Badge variant={viewerEmail.status === "sent" ? "default" : "destructive"} className="text-xs capitalize">
                  {viewerEmail.status}
                </Badge>
              </div>
              {viewerLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : viewerHtml ? (
                <iframe
                  srcDoc={viewerHtml}
                  sandbox=""
                  title="Sent email"
                  className="w-full h-[50vh] rounded-lg border border-border/30 bg-white"
                />
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">Content unavailable.</p>
              )}
              <div className="flex gap-2 items-center pt-1">
                <Input
                  placeholder="Forward to email…"
                  type="email"
                  value={forwardTo}
                  onChange={(e) => setForwardTo(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleForward(); }}
                  disabled={!viewerHtml}
                />
                <Button onClick={handleForward} disabled={!viewerHtml || !forwardTo.trim() || forwarding} className="shrink-0">
                  {forwarding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}
                  Forward
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Compose email</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <Label>Recipients</Label>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={
                      composeClients.some((c) => c.email) &&
                      composeClients.filter((c) => c.email).every((c) => composeSelectedIds.includes(c.id))
                    }
                    onChange={(e) => {
                      const emailableIds = composeClients.filter((c) => c.email).map((c) => c.id);
                      setComposeSelectedIds(e.target.checked ? emailableIds : []);
                    }}
                  />
                  Select all
                </label>
              </div>
              <div className="border rounded p-2 max-h-40 overflow-y-auto space-y-1 mt-1">
                {composeClients.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={composeSelectedIds.includes(c.id)}
                      disabled={!c.email}
                      onChange={(e) =>
                        setComposeSelectedIds((ids) => (e.target.checked ? [...ids, c.id] : ids.filter((id) => id !== c.id)))
                      }
                    />
                    {c.full_name} <span className="text-muted-foreground">({c.email || "no email"})</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label>Subject</Label>
              <Input value={composeSubject} onChange={(e) => setComposeSubject(e.target.value)} />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label>Message</Label>
                <button
                  type="button"
                  onClick={handlePolish}
                  disabled={polishing || !composeMessage.trim()}
                  title="Polish with AI"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 disabled:opacity-40 transition-colors"
                >
                  {polishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  Polish with AI
                </button>
              </div>
              <Textarea rows={6} value={composeMessage} onChange={(e) => setComposeMessage(e.target.value)} />
            </div>
            <Button
              onClick={sendCompose}
              disabled={composeSending || composeSelectedIds.length === 0 || !composeSubject.trim() || !composeMessage.trim()}
              className="w-full"
            >
              {composeSending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Send
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inbox;
