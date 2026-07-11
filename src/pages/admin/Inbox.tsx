import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Send, Loader2, Inbox as InboxIcon } from "lucide-react";
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

const Inbox = () => {
  const { toast } = useToast();
  const [clients, setClients] = useState<ThreadClient[]>([]);
  const [messagesByClient, setMessagesByClient] = useState<Record<string, Message[]>>({});
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

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

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedClient = clients.find((c) => c.id === selectedClientId) || null;
  const threadMessages = selectedClientId
    ? [...(messagesByClient[selectedClientId] || [])].reverse()
    : [];

  const needsReply = (clientId: string) => messagesByClient[clientId]?.[0]?.sender === "client";

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
      <h1 className="text-2xl font-display tracking-wider mb-6 flex items-center gap-2">
        <InboxIcon className="h-6 w-6 text-primary" /> Inbox
      </h1>

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
    </div>
  );
};

export default Inbox;
