import { useEffect, useRef, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { MessageCircle, X, Send, Loader2, Sparkles } from "lucide-react";
import { useAiChat } from "@/hooks/useAiChat";

const HIDDEN_PREFIXES = ["/admin", "/portal"];
const PROMPTS = [
  "What does Aethyx do?",
  "How much does a website cost?",
  "How do I get started?",
  "Do you work with med spas?",
];

// Render assistant text and turn /paths into Links.
const renderContent = (text: string, onNav: () => void) => {
  const parts = text.split(/(\/[a-z][a-z0-9-]*(?:\/[a-z0-9-]+)*)/gi);
  return parts.map((p, i) => {
    if (/^\/[a-z]/i.test(p) && p.length < 40) {
      return (
        <Link
          key={i}
          to={p}
          onClick={onNav}
          className="underline text-primary hover:text-primary/80"
        >
          {p}
        </Link>
      );
    }
    return <span key={i}>{p}</span>;
  });
};

const PublicConcierge = () => {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, send, isLoading, error } = useAiChat(
    "concierge",
    "Hi! I'm here if you need help finding your way around or have a question about working with Kristin. What brings you here today?",
  );

  // Hide on admin / portal
  const hidden = HIDDEN_PREFIXES.some((p) => location.pathname.startsWith(p));

  // Soft nudge after 8s on a page if user hasn't opened it yet
  useEffect(() => {
    if (hidden) return;
    const seen = sessionStorage.getItem("aethyx_concierge_seen");
    if (seen) return;
    const t = setTimeout(() => setNudge(true), 8000);
    return () => clearTimeout(t);
  }, [hidden]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  if (hidden) return null;

  const openPanel = () => {
    setOpen(true);
    setNudge(false);
    sessionStorage.setItem("aethyx_concierge_seen", "1");
  };

  const submit = () => {
    if (!input.trim()) return;
    send(input);
    setInput("");
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <div className="fixed bottom-5 right-5 z-50 flex items-end gap-2">
          {nudge && (
            <button
              onClick={openPanel}
              className="hidden sm:block bg-[#0a0a14]/95 border border-primary/30 text-foreground text-xs px-3 py-2 rounded-lg shadow-lg max-w-[220px] text-left animate-fade-in"
            >
              Lost? I can point you in the right direction.
            </button>
          )}
          <button
            onClick={openPanel}
            aria-label="Open concierge chat"
            className="relative bg-primary text-primary-foreground h-14 w-14 rounded-full shadow-xl hover:scale-105 transition-transform flex items-center justify-center"
          >
            <MessageCircle className="h-6 w-6" />
            {nudge && (
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-destructive animate-pulse" />
            )}
          </button>
        </div>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[min(380px,calc(100vw-2.5rem))] h-[min(560px,calc(100vh-2.5rem))] flex flex-col bg-[#0a0a14] border border-primary/30 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-[#0a0a14]">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-sm font-display tracking-wider text-foreground">
                  Aethyx Concierge
                </div>
                <div className="text-[10px] text-muted-foreground">Usually replies instantly</div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 whitespace-pre-wrap leading-relaxed ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-white/5 border border-border/30 text-foreground rounded-bl-sm"
                  }`}
                >
                  {m.role === "assistant"
                    ? renderContent(m.content || (isLoading ? "…" : ""), () => setOpen(false))
                    : m.content}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Typing…
              </div>
            )}
            {error && <div className="text-xs text-destructive">{error}</div>}

            {messages.length <= 1 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => send(p)}
                    className="text-xs px-3 py-1.5 rounded-full border border-primary/30 text-primary/90 hover:bg-primary/10"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 border-t border-border/30 bg-[#0a0a14]">
            <div className="flex gap-2 items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
                placeholder="Ask anything…"
                rows={1}
                className="flex-1 resize-none bg-white/5 border border-border/30 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 max-h-24"
                disabled={isLoading}
              />
              <button
                onClick={submit}
                disabled={isLoading || !input.trim()}
                className="h-10 w-10 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center shrink-0"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
            <div className="text-[10px] text-muted-foreground mt-2 text-center">
              AI concierge — for human help, email aethyxspace@protonmail.com
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PublicConcierge;
