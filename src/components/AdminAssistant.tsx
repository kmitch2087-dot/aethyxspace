import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, RotateCcw, Loader2, MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const submit = () => {
    if (!input.trim()) return;
    send(input);
    setInput("");
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open admin assistant"
          className="fixed bottom-5 right-5 z-50 bg-primary text-primary-foreground h-14 w-14 rounded-full shadow-xl hover:scale-105 transition-transform flex items-center justify-center"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[min(400px,calc(100vw-2.5rem))] h-[min(600px,calc(100vh-2.5rem))] flex flex-col bg-white border border-black/10 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-black/10 bg-white">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="text-sm font-display tracking-wider text-black">Admin Assistant</div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={reset} className="text-xs text-black/60 h-7 px-2">
                <RotateCcw className="h-3 w-3 mr-1" /> Reset
              </Button>
              <button onClick={() => setOpen(false)} aria-label="Close assistant" className="text-black/50 hover:text-black">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-black/[0.03] border border-black/10 text-black"
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
          </div>

          <div className="p-3 border-t border-black/10 bg-white">
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
          </div>
        </div>
      )}
    </>
  );
};

export default AdminAssistant;
