import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePortalClientProfile } from "@/hooks/usePortalClientProfile";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Send, Loader2 } from "lucide-react";
import { format } from "date-fns";

const PortalMessages = () => {
  const { user } = useAuth();
  const { profile: resolvedProfile, loading: profileLoading, isViewingAsAdmin } = usePortalClientProfile();
  const { toast } = useToast();
  const [messages, setMessages] = useState<any[]>([]);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchMessages = async () => {
    if (!user || profileLoading) return;
    const pid = resolvedProfile?.id ?? null;
    setProfileId(pid);
    const filter = pid
      ? `client_profile_id.eq.${pid},user_id.eq.${user.id}`
      : `user_id.eq.${user.id}`;
    const { data } = await supabase
      .from("client_messages")
      .select("*")
      .or(filter)
      .order("created_at", { ascending: false });
    setMessages(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();
  }, [user, resolvedProfile, profileLoading]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user || isViewingAsAdmin) return;
    setSending(true);
    const { error } = await supabase.from("client_messages").insert({
      user_id: user.id,
      client_profile_id: profileId,
      message: newMessage.trim(),
    });
    setSending(false);
    if (error) {
      toast({ title: "Failed to send", description: error.message, variant: "destructive" });
    } else {
      setNewMessage("");
      toast({ title: "Message sent!" });
      fetchMessages();
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-display tracking-wider mb-6">Messages</h1>

      <div className="mb-8 space-y-3">
        <Textarea
          placeholder="Send a note about your project, request changes, ask questions..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          maxLength={2000}
          className="min-h-[120px]"
        />
        <Button onClick={handleSend} disabled={isViewingAsAdmin || sending || !newMessage.trim()}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
          Send Message
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      ) : messages.length === 0 ? (
        <p className="text-muted-foreground text-sm">No messages yet. Send your first one above!</p>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === "admin" ? "justify-start" : "justify-end"}`}>
              <Card className={`max-w-[80%] ${msg.sender === "admin" ? "" : "bg-primary/5 border-primary/20"}`}>
                <CardContent className="pt-4">
                  <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {msg.sender === "admin" ? "Aethyx" : "You"} ·{" "}
                    {format(new Date(msg.created_at), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PortalMessages;
