import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAiChat } from "@/hooks/useAiChat";

const SUGGESTIONS = [
  "Draft a follow-up email to a consultation lead",
  "Write a 3-paragraph blog intro about brand systems",
  "Summarize the key questions I should ask on a discovery call",
  "Refine this service description to sound more premium: ...",
];

const AdminAssistant = () => {
  const { messages, send, isLoading, error, reset } = useAiChat(
    "admin",
    "Hi Kristin. What can I help you crush today?",
  );
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const submit = () => {
    if (!input.trim()) return;
    send(input);
    setInput("");
  };

  return (
    <Card className="bg-white border-black/10">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base font-display tracking-wider">
          <Sparkles className="h-4 w-4 text-primary" />
          Admin Assistant
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={reset} className="text-xs text-black/60">
          <RotateCcw className="h-3 w-3 mr-1" /> Reset
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div
          ref={scrollRef}
          className="h-72 overflow-y-auto rounded-md border border-black/10 bg-black/[0.02] p-3 space-y-3 text-sm"
        >
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-white border border-black/10 text-black"
                }`}
              >
                {m.content || (isLoading && i === messages.length - 1 ? "…" : "")}
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex items-center gap-2 text-xs text-black/50">
              <Loader2 className="h-3 w-3 animate-spin" /> Thinking…
            </div>
          )}
          {error && <div className="text-xs text-destructive">{error}</div>}
        </div>

        {messages.length <= 1 && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-xs px-3 py-1.5 rounded-full border border-black/10 hover:bg-black/5 text-black/70"
              >
                {s.length > 50 ? s.slice(0, 50) + "…" : s}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Ask anything — drafts, ideas, summaries…"
            className="min-h-[44px] max-h-32 resize-none bg-white border-black/10 text-black"
            disabled={isLoading}
          />
          <Button onClick={submit} disabled={isLoading || !input.trim()} size="icon">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminAssistant;
