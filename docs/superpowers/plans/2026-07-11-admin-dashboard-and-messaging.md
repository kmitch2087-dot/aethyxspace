# Admin Dashboard Redesign + Client Messaging Inbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `AdminAssistant` into a floating bubble (matching the public site's `PublicConcierge` pattern) instead of an inline Dashboard panel, fill the freed Dashboard space with genuinely useful "Needs Attention" widgets, and let admin actually reply to clients — today `client_messages` is client→admin only with no UI path for admin to send.

**Architecture:** No schema migration needed — live-DB verification found `client_messages` already has `sender text NOT NULL DEFAULT 'client'`, `client_profile_id`, and `document_id` columns (applied at some point, never captured by a committed migration — the same "live drift" pattern already tracked elsewhere in this repo — and the table currently has zero rows, so there's no backfill concern). RLS is already correctly `has_role`-scoped for admin (`FOR ALL`) and profile-scoped for clients. This plan is UI-only: a floating-bubble refactor of `AdminAssistant`, a new Dashboard section querying counts from five existing tables, a send-box added to `ClientDetail.tsx`'s Messages tab, and a new consolidated Inbox page.

**Tech Stack:** Vite + React + TypeScript, Supabase (Postgres + RLS), shadcn/ui, Tailwind, React Router.

## Global Constraints

- No database migration in this plan — `client_messages`'s `sender`/`client_profile_id`/`document_id` columns already exist live. Do not attempt to re-add them.
- Admin-authored messages must be inserted with `user_id` = the **client's** own user id (not the admin's) and `client_profile_id` set — required for the client's existing RLS-scoped SELECT policies to ever show the message. `sender: 'admin'` is what distinguishes it.
- `document_id` on `client_messages` is out of scope for this plan — leave it `null` on every insert here; it's presumably for a future feature, not this one.
- Do not touch `PublicConcierge.tsx` or anything on the public site — only the admin-side assistant changes shape.
- Commit after every task, signed with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

---

### Task 1: `AdminAssistant` → floating bubble, rendered globally

**Files:**
- Modify: `src/components/AdminAssistant.tsx` (full rewrite of the outer shell, same `useAiChat` hook usage)
- Modify: `src/pages/admin/AdminLayout.tsx` (render it globally)
- Modify: `src/pages/admin/Dashboard.tsx` (remove the inline `<AdminAssistant />` block)

**Interfaces:**
- Consumes: `useAiChat("admin", ...)` hook (unchanged, existing).
- Produces: `AdminAssistant` becomes a self-contained floating widget with no required props — consumed by `AdminLayout.tsx` (this task), not `Dashboard.tsx` anymore.

- [ ] **Step 1: Rewrite `AdminAssistant.tsx` as a floating bubble**

Current file (`src/components/AdminAssistant.tsx`, 111 lines) renders an inline `<Card>` with a fixed-height chat window. Replace the entire file with a floating-bubble version, structurally mirroring `src/components/PublicConcierge.tsx`'s open/closed bubble pattern (same fixed positioning, same panel shape) but keeping `AdminAssistant`'s own chat logic (`useAiChat("admin", ...)`, the `reset` button, the `SUGGESTIONS` prompts) and light (not dark) theming to match the admin panel's existing white/black color scheme:

```tsx
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
```

- [ ] **Step 2: Render it globally in `AdminLayout.tsx`**

Find the import section and the closing `</SidebarProvider>` in `src/pages/admin/AdminLayout.tsx`. Add the import near the other component imports:
```tsx
import AdminAssistant from "@/components/AdminAssistant";
```
Render it once, as a sibling to the existing `<div className="min-h-screen flex w-full bg-transparent">` root (so it floats above the whole admin layout regardless of which page is showing), just before the closing `</SidebarProvider>`:
```tsx
        </div>
      </div>
      <AdminAssistant />
    </SidebarProvider>
```

- [ ] **Step 3: Remove the inline `<AdminAssistant />` block from `Dashboard.tsx`**

Current (`src/pages/admin/Dashboard.tsx`, around line 118-123):
```tsx
    <div>
      <h1 className="text-2xl font-display tracking-wider mb-6">Dashboard</h1>

      <div className="mb-8">
        <AdminAssistant />
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
```
Replace with (drop the `<div className="mb-8"><AdminAssistant /></div>` block and its now-unused import):
```tsx
    <div>
      <h1 className="text-2xl font-display tracking-wider mb-6">Dashboard</h1>

      <Tabs defaultValue="overview" className="space-y-6">
```
Also remove the now-unused `import AdminAssistant from "@/components/AdminAssistant";` line from `Dashboard.tsx`'s imports (line 6) — it's rendered in `AdminLayout.tsx` now instead.

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit -p .
npx eslint src/components/AdminAssistant.tsx src/pages/admin/AdminLayout.tsx src/pages/admin/Dashboard.tsx
npm run dev
```
Manually confirm: the assistant is now a bottom-right floating bubble visible on every admin page (not just Dashboard), opens/closes correctly, chat still works (same `useAiChat("admin", ...)` context as before — conversation history should behave identically to the old inline version), and the Dashboard's top no longer has the old inline chat panel.

- [ ] **Step 5: Commit**

```bash
git add src/components/AdminAssistant.tsx src/pages/admin/AdminLayout.tsx src/pages/admin/Dashboard.tsx
git commit -m "$(cat <<'EOF'
Turn AdminAssistant into a floating bubble, render it globally

Matches PublicConcierge's pattern instead of the old inline Dashboard
panel that dominated the top of the admin landing page. Rendered once
in AdminLayout.tsx so it's available from every admin page, not just
Dashboard. Same useAiChat("admin", ...) hook/logic — only the
container/trigger changed shape.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Dashboard "Needs Attention" section

**Files:**
- Modify: `src/pages/admin/Dashboard.tsx`

**Interfaces:**
- Consumes: `client_messages` (sender/client_profile_id), `client_invoices`, `client_intakes`, `bounty_applicants`, `client_add_ons` — all existing tables.
- Produces: nothing consumed by later tasks (independent of Task 3/4's messaging UI — this task's "unread messages" count is read-only and self-contained).

- [ ] **Step 1: Add state and a fetch for the five counts**

Add near the existing `stats`/`trafficStats` state (after `const [loading, setLoading] = useState(true);`):
```tsx
  const [attention, setAttention] = useState({
    unreadThreads: 0,
    pendingInvoicesCount: 0,
    pendingInvoicesTotal: 0,
    pendingIntakes: 0,
    pendingBountyApplicants: 0,
    pendingAddOnRequests: 0,
  });
```

Add a second fetch function, called alongside the existing `fetchStats()`:
```tsx
  const fetchAttention = async () => {
    const [msgRes, invRes, intakeRes, bountyRes, addOnRes] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from("client_messages")
        .select("client_profile_id, sender, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("client_invoices").select("amount_due, status").neq("status", "paid"),
      supabase.from("client_intakes").select("id").eq("status", "new"),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from("bounty_applicants").select("id").eq("status", "pending"),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from("client_add_ons").select("id").eq("status", "requested"),
    ]);

    // A thread "needs attention" when the most recent message in it was sent by the
    // client (i.e. admin hasn't replied yet) — no separate seen-at tracking needed.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const msgRows = (msgRes.data || []) as any[];
    const latestByThread = new Map<string, string>();
    for (const row of msgRows) {
      const key = row.client_profile_id || "unknown";
      if (!latestByThread.has(key)) latestByThread.set(key, row.sender);
    }
    const unreadThreads = Array.from(latestByThread.values()).filter((s) => s === "client").length;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invoices = (invRes.data || []) as any[];

    setAttention({
      unreadThreads,
      pendingInvoicesCount: invoices.length,
      pendingInvoicesTotal: invoices.reduce((sum, i) => sum + Number(i.amount_due || 0), 0),
      pendingIntakes: (intakeRes.data || []).length,
      pendingBountyApplicants: (bountyRes.data || []).length,
      pendingAddOnRequests: (addOnRes.data || []).length,
    });
  };
```
Add `fetchAttention();` to the existing `useEffect` that calls `fetchStats()` (or add a second small `useEffect(() => { fetchAttention(); }, []);` right after it — either is fine, keep them as two clearly-separated concerns rather than merging the two fetch functions into one).

- [ ] **Step 2: Render the "Needs Attention" section**

Add this new section right after the `<h1>` and before the existing `<Tabs>` block (i.e., it's always visible, not inside any tab):
```tsx
      <h2 className="text-xl font-display tracking-wider mb-4">Needs Attention</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mb-10">
        <Link to="/admin/inbox" className="block">
          <Card className="border-border/30 hover:border-primary/40 transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Unread Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{attention.unreadThreads}</div>
              <p className="text-xs text-muted-foreground mt-1">threads awaiting reply</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/admin/invoices" className="block">
          <Card className="border-border/30 hover:border-primary/40 transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Invoices</CardTitle>
              <Receipt className="h-4 w-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{attention.pendingInvoicesCount}</div>
              <p className="text-xs text-muted-foreground mt-1">${attention.pendingInvoicesTotal.toLocaleString()} outstanding</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/admin/intakes" className="block">
          <Card className="border-border/30 hover:border-primary/40 transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">New Intakes</CardTitle>
              <FileSignature className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{attention.pendingIntakes}</div>
              <p className="text-xs text-muted-foreground mt-1">awaiting review</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/admin/referral-program" className="block">
          <Card className="border-border/30 hover:border-primary/40 transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Bounty Applicants</CardTitle>
              <Share2 className="h-4 w-4 text-teal-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{attention.pendingBountyApplicants}</div>
              <p className="text-xs text-muted-foreground mt-1">pending approval</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/admin/add-ons" className="block">
          <Card className="border-border/30 hover:border-primary/40 transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Add-On Requests</CardTitle>
              <DollarSign className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{attention.pendingAddOnRequests}</div>
              <p className="text-xs text-muted-foreground mt-1">pending requests</p>
            </CardContent>
          </Card>
        </Link>
      </div>
```
Add `import { Link } from "react-router-dom";` and `Receipt` to the existing `lucide-react` import list at the top of `Dashboard.tsx` (check `Receipt`/`MessageSquare`/`FileSignature`/`Share2`/`DollarSign` aren't already imported before adding duplicates — `MessageSquare`, `FileSignature`, `DollarSign` already are per the existing import list; only `Link` and `Receipt` are new).

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit -p .
npx eslint src/pages/admin/Dashboard.tsx
npm run dev
```
Manually confirm all 5 new cards render with real counts, each links to the correct page, and the section sits above the existing stat cards/Tabs.

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin/Dashboard.tsx
git commit -m "$(cat <<'EOF'
Add Needs Attention section to the admin Dashboard

Five new cards (unread messages, pending invoices, new intakes,
bounty applicants, add-on requests) fill the space freed by moving
the AI assistant to a floating bubble. "Unread messages" is derived
without any new seen-at tracking: a thread needs attention when its
most recent message was sent by the client (admin hasn't replied yet).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Two-way messaging in `ClientDetail.tsx`'s Messages tab

**Files:**
- Modify: `src/pages/admin/ClientDetail.tsx` — Messages tab render (around line 3116), add a send handler

**Interfaces:**
- Consumes: `client_messages` (existing schema — `sender`, `client_profile_id`, `user_id` already live).
- Produces: nothing consumed by later tasks (Task 4's Inbox is a separate, standalone page reading/writing the same table independently).

- [ ] **Step 1: Add a send handler**

Add near the other message-related state/handlers in `ClientDetail.tsx` (the component already has `messages` state and fetches it in `fetchAll`, per line 454's query):
```tsx
  const [newAdminMessage, setNewAdminMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  const sendAdminMessage = async () => {
    if (!profile || !newAdminMessage.trim()) return;
    setSendingMessage(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("client_messages").insert({
      user_id: profile.user_id,
      client_profile_id: profile.id,
      sender: "admin",
      message: newAdminMessage.trim(),
    });
    setSendingMessage(false);
    if (error) {
      toast({ title: "Failed to send", description: error.message, variant: "destructive" });
      return;
    }
    setNewAdminMessage("");
    toast({ title: "Message sent" });
    fetchAll();
  };
```

- [ ] **Step 2: Add a send box to the Messages tab render**

Current (`src/pages/admin/ClientDetail.tsx:3116-3123`):
```tsx
        <TabsContent value="messages" className="mt-4 space-y-2">
          {messages.length === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">No messages.</p> : messages.map((m) => (
            <Card key={m.id}><CardContent className="pt-4">
              <p className="text-sm whitespace-pre-wrap">{m.message}</p>
              <p className="text-xs text-muted-foreground mt-1">{format(new Date(m.created_at), "MMM d, yyyy h:mm a")}</p>
            </CardContent></Card>
          ))}
        </TabsContent>
```
Replace with (adds a send box above the list, and visually distinguishes admin-sent vs client-sent messages by alignment/color — matching the chat-bubble convention already used elsewhere in this file, e.g. the AI Asset Scraping review panel):
```tsx
        <TabsContent value="messages" className="mt-4 space-y-3">
          <div className="flex gap-2 items-end">
            <Textarea
              value={newAdminMessage}
              onChange={(e) => setNewAdminMessage(e.target.value)}
              placeholder="Reply to this client…"
              className="min-h-[80px] max-h-40"
              maxLength={2000}
            />
            <Button onClick={sendAdminMessage} disabled={sendingMessage || !newAdminMessage.trim()}>
              {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          {messages.length === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">No messages.</p> : messages.map((m) => (
            <div key={m.id} className={`flex ${m.sender === "admin" ? "justify-end" : "justify-start"}`}>
              <Card className={`max-w-[80%] ${m.sender === "admin" ? "bg-primary/5 border-primary/20" : ""}`}>
                <CardContent className="pt-4">
                  <p className="text-sm whitespace-pre-wrap">{m.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {m.sender === "admin" ? "You" : profile.full_name} · {format(new Date(m.created_at), "MMM d, yyyy h:mm a")}
                  </p>
                </CardContent>
              </Card>
            </div>
          ))}
        </TabsContent>
```
Check `Send` is already imported from `lucide-react` in this file (it's used elsewhere for the client-facing pattern in `PortalMessages.tsx`, but confirm/add for `ClientDetail.tsx` specifically) — add it to the existing `lucide-react` import list if missing.

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit -p .
npx eslint src/pages/admin/ClientDetail.tsx
npm run dev
```
Manually send a test message from a real client's Messages tab, confirm it appears right-aligned/highlighted, and confirm (via Supabase MCP `execute_sql`) the inserted row has `sender: 'admin'`, `user_id` matching the client's own user_id (not the admin's), and `client_profile_id` set. Confirm the client can see this message in their own `PortalMessages.tsx` (client-side RLS already scopes by `user_id`/`client_profile_id`, both correctly set by this insert).

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin/ClientDetail.tsx
git commit -m "$(cat <<'EOF'
Let admin reply to clients from ClientDetail's Messages tab

Was read-only — no input box, no send action at all. Inserts with
sender: 'admin' and user_id set to the client's own user_id (required
for the client's existing RLS-scoped SELECT to see it), reusing the
sender/client_profile_id columns that already exist live on
client_messages (confirmed via direct query, never a committed
migration — no schema change needed here).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Admin Inbox page

**Files:**
- Create: `src/pages/admin/Inbox.tsx`
- Modify: `src/App.tsx` (new route)
- Modify: `src/pages/admin/AdminLayout.tsx` (new nav item)

**Interfaces:**
- Consumes: `client_messages`, `client_profiles` (existing schema).
- Produces: nothing consumed by later tasks (final task in this plan).

- [ ] **Step 1: Write the Inbox page**

```tsx
// src/pages/admin/Inbox.tsx
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: msgData } = await (supabase as any)
      .from("client_messages")
      .select("id, client_profile_id, sender, message, created_at")
      .not("client_profile_id", "is", null)
      .order("created_at", { ascending: false });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("client_messages").insert({
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
```

- [ ] **Step 2: Add the route**

In `src/App.tsx`, add the import near the other admin page imports (after `import Inquiries from "./pages/admin/Inquiries";`):
```tsx
import Inbox from "./pages/admin/Inbox";
```
Add the route inside the `/admin` route block (after `<Route path="inquiries" element={<Inquiries />} />`):
```tsx
<Route path="inbox" element={<Inbox />} />
```

- [ ] **Step 3: Add the nav item**

In `src/pages/admin/AdminLayout.tsx`, add `Inbox` (aliased to avoid colliding with `MessageSquare`/other icon names already imported) to the `lucide-react` import list, and add a new nav entry to `navItems` — place it right after `"Dashboard"` for visibility:
```tsx
import {
  LayoutDashboard,
  Inbox as InboxIcon,
  FileText,
  MessageSquare,
  Star,
  FileSignature,
  DollarSign,
  Users,
  FolderOpen,
  FolderKanban,
  Image as ImageIcon,
  Receipt,
  LogOut,
  GitBranch,
  Puzzle,
} from "lucide-react";
```
```tsx
const navItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Inbox", url: "/admin/inbox", icon: InboxIcon },
  { title: "Intakes", url: "/admin/intakes", icon: MessageSquare },
  ...
```

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit -p .
npx eslint src/pages/admin/Inbox.tsx src/App.tsx src/pages/admin/AdminLayout.tsx
npm run dev
```
Manually visit `/admin/inbox`, confirm it lists clients with existing threads (if any test messages exist from Task 3's manual test), shows "Reply needed" correctly on threads whose latest message is client-sent, and sending a reply from here updates both this page and the corresponding client's own `PortalMessages.tsx` view.

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/Inbox.tsx src/App.tsx src/pages/admin/AdminLayout.tsx
git commit -m "$(cat <<'EOF'
Add consolidated admin Inbox page

Lists every client with an active message thread, most-recent-first,
flagging threads whose last message was client-sent ("Reply needed").
Click a thread to see the full history and reply — same
client_messages table Task 3's ClientDetail.tsx send-box uses, just a
cross-client view instead of one-client-at-a-time.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
