import { useCallback, useRef, useState } from "react";

export type ChatMsg = { role: "user" | "assistant"; content: string };

const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export function useAiChat(mode: "admin" | "concierge", greeting?: string) {
  const [messages, setMessages] = useState<ChatMsg[]>(
    greeting ? [{ role: "assistant", content: greeting }] : [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setMessages(greeting ? [{ role: "assistant", content: greeting }] : []);
    setError(null);
  }, [greeting]);

  const send = useCallback(
    async (input: string) => {
      const text = input.trim();
      if (!text || isLoading) return;

      setError(null);
      const userMsg: ChatMsg = { role: "user", content: text };
      const next = [...messages, userMsg];
      setMessages(next);
      setIsLoading(true);

      const controller = new AbortController();
      abortRef.current = controller;

      let assistantSoFar = "";
      const upsert = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, content: assistantSoFar } : m,
            );
          }
          return [...prev, { role: "assistant", content: assistantSoFar }];
        });
      };

      try {
        const resp = await fetch(ENDPOINT, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ANON}`,
          },
          body: JSON.stringify({ messages: next, mode }),
        });

        if (!resp.ok || !resp.body) {
          if (resp.status === 429) throw new Error("Busy right now — please try again in a moment.");
          if (resp.status === 402) throw new Error("AI usage limit reached.");
          throw new Error("Something went wrong.");
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let textBuffer = "";
        let done = false;

        while (!done) {
          const { done: rDone, value } = await reader.read();
          if (rDone) break;
          textBuffer += decoder.decode(value, { stream: true });

          let nl: number;
          while ((nl = textBuffer.indexOf("\n")) !== -1) {
            let line = textBuffer.slice(0, nl);
            textBuffer = textBuffer.slice(nl + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6).trim();
            if (json === "[DONE]") { done = true; break; }
            try {
              const parsed = JSON.parse(json);
              const c = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (c) upsert(c);
            } catch {
              textBuffer = line + "\n" + textBuffer;
              break;
            }
          }
        }
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          setError(e?.message || "Something went wrong.");
        }
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [messages, isLoading, mode],
  );

  return { messages, send, isLoading, error, reset };
}
