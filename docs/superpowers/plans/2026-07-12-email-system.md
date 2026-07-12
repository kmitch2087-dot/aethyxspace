# Branded Email System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Aethyx logo to every outgoing email, add a "Sent" tab to the admin Inbox that logs real outbound emails (collapsing mass sends into one thread), and add a general-purpose branded "Compose email" feature reachable from both the Inbox and a client's own profile page.

**Architecture:** No new tables — `email_send_log.metadata` (jsonb) already exists and is currently unused; it becomes the home for an optional `batch_id` that groups a multi-recipient send into one collapsible thread in the new Sent tab. The logo is added as a small, mechanical `<Img>` insertion into each of the 17 existing email template files, referencing a new stable public URL (`public/aethyx-logo.png`) rather than the existing Vite-bundled/hashed asset path. A new `admin-compose` template renders an admin-authored subject/message inside the same branded wrapper every other template uses.

**Tech Stack:** Vite + React + TypeScript, Supabase Edge Functions (Deno), `@react-email/components`, Resend (email delivery), shadcn/ui.

## Global Constraints

- Plain text only in Compose — no rich text, no attachments, matching every existing template's convention.
- No backfill/retrofit of `batch_id` onto historical `email_send_log` rows — they render as individual entries exactly as they do today.
- The 17 existing templates keep their current layout/copy exactly as-is apart from the added logo — no redesign, no shared-wrapper refactor.
- `send-transactional-email`'s existing callers (which never pass `metadata`) must continue to work identically — `metadata` is purely additive/optional.
- Commit after every task, signed with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

---

### Task 1: Logo in all 17 email templates

**Files:**
- Create: `public/aethyx-logo.png` (copy of `src/assets/aethyx-web-design-studio-logo.png`)
- Modify: all 17 files in `supabase/functions/_shared/transactional-email-templates/*.tsx` (list in Step 2)

**Interfaces:**
- Produces: a stable public logo URL (`https://aethyx.space/aethyx-logo.png`) — consumed by Task 3's new `admin-compose` template too.

- [ ] **Step 1: Copy the logo into `public/`**

```bash
cp src/assets/aethyx-web-design-studio-logo.png public/aethyx-logo.png
```

Vite serves everything in `public/` at a fixed, un-hashed path — unlike the existing `src/assets/` copy, which gets a content-hashed filename on every build (unusable as a stable `<img src>` in an email that might be opened weeks after being sent).

- [ ] **Step 2: Add the logo to each template**

Every one of these 17 files currently starts its visible content with the identical structure `<Body style={main}><Container style={container}><Heading style={h1}>...` (confirmed by direct inspection of `new-invoice.tsx`, `add-on-activated.tsx`, `bounty-approved.tsx`, `document-share.tsx`, `fee-waived.tsx`, and `inquiry-notification.tsx` — all five match). For each file below, find its `<Container style={container}>` line and the `<Heading` line immediately following it (possibly with a blank line between), and insert this block between them:

```tsx
        <Img src="https://aethyx.space/aethyx-logo.png" width="120" alt="Aethyx" style={logo} />
```

Also add `Img` to the file's existing `@react-email/components` import list (e.g. `Body, Container, Head, Heading, Html, ...` becomes `Body, Container, Head, Heading, Html, Img, ...` — insert alphabetically-ish alongside the existing names, don't reorder the whole list), and add this style constant alongside the file's other `const xyz = {...}` style declarations near the bottom:

```tsx
const logo = { marginBottom: '20px' }
```

Files to update (all in `supabase/functions/_shared/transactional-email-templates/`):
`add-on-activated.tsx`, `bounty-approved.tsx`, `document-share.tsx`, `fee-waived.tsx`, `inquiry-notification.tsx`, `intake-confirmation.tsx`, `intake-notification.tsx`, `intake-required.tsx`, `invoice-delivery.tsx`, `marketing-services-spotlight.tsx`, `new-documents.tsx`, `new-invoice.tsx`, `payment-received.tsx`, `portal-activation-notification.tsx`, `portal-invite.tsx`, `referral-payout.tsx`, `referral-signed.tsx`.

**Concretely, for `new-invoice.tsx`** (as a worked example — apply the same shape of edit to the other 16), current:
```tsx
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
```
```tsx
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
```
Replace with:
```tsx
import {
  Body, Button, Container, Head, Heading, Html, Img, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
```
```tsx
    <Body style={main}>
      <Container style={container}>
        <Img src="https://aethyx.space/aethyx-logo.png" width="120" alt="Aethyx" style={logo} />
        <Heading style={h1}>
```
And add `const logo = { marginBottom: '20px' }` near the other `const ... = {...}` declarations at the bottom of the file.

**If any of the other 16 files' structure doesn't match** (i.e., `<Container style={container}>` is not immediately followed by a `<Heading` line, allowing for whitespace), stop and report back with what that file's actual opening structure looks like rather than guessing an insertion point — don't force the pattern onto a file it doesn't fit.

- [ ] **Step 3: Verify**

Since `supabase/functions/**` is excluded from this repo's root `tsconfig` (confirmed in prior work this session — `npx tsc --noEmit -p .` does not typecheck these files), verify by:
1. Reading each of the 17 modified files back and confirming: the `Img` import was added without removing/reordering other names, exactly one `<Img .../>` line was inserted per file, and the `logo` style constant was added.
2. A brace/paren balance check per file (a quick script counting `{`/`}` and `(`/`)`, same approach used earlier this session for other Deno files under this same tsconfig exclusion).

- [ ] **Step 4: Deploy nothing yet**

These files are only referenced by `send-transactional-email` (via the `registry.ts` import graph) — no edge function needs redeploying until Task 2 also changes `send-transactional-email/index.ts` itself. Bundle the deploy with Task 2 to avoid deploying twice.

- [ ] **Step 5: Commit**

```bash
git add public/aethyx-logo.png supabase/functions/_shared/transactional-email-templates/
git commit -m "$(cat <<'EOF'
Add Aethyx logo to all outgoing email templates

Copied the logo into public/ for a stable, un-hashed URL
(https://aethyx.space/aethyx-logo.png) — the existing src/assets/
copy gets a content-hashed filename on every rebuild, unusable as a
stable <img src> in an email that might be opened weeks later.
Inserted a small logo image at the top of all 17 existing templates,
above the existing heading — no other layout change.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `send-transactional-email` accepts and stores optional `metadata`

**Files:**
- Modify: `supabase/functions/send-transactional-email/index.ts`

**Interfaces:**
- Consumes: nothing from Task 1 directly (independent), but deployed together per Task 1 Step 4.
- Produces: `send-transactional-email` now accepts an optional `metadata: Record<string, any>` field in its request body and persists it into `email_send_log.metadata` — consumed by Task 3 (compose) and Task 4 (Sent tab reads it back).

- [ ] **Step 1: Accept and store `metadata`**

Current (`supabase/functions/send-transactional-email/index.ts`):
```ts
  let templateName: string
  let recipientEmail: string
  let templateData: Record<string, any> = {}
  try {
    const body = await req.json()
    templateName = body.templateName || body.template_name
    recipientEmail = body.recipientEmail || body.recipient_email
    if (body.templateData && typeof body.templateData === 'object') templateData = body.templateData
  } catch {
```
Replace with:
```ts
  let templateName: string
  let recipientEmail: string
  let templateData: Record<string, any> = {}
  let metadata: Record<string, any> | null = null
  try {
    const body = await req.json()
    templateName = body.templateName || body.template_name
    recipientEmail = body.recipientEmail || body.recipient_email
    if (body.templateData && typeof body.templateData === 'object') templateData = body.templateData
    if (body.metadata && typeof body.metadata === 'object') metadata = body.metadata
  } catch {
```

Current (the log insert):
```ts
  // Log to email_send_log
  await supabase.from('email_send_log').insert({
    message_id: resBody.id || crypto.randomUUID(),
    template_name: templateName,
    recipient_email: to,
    status: res.ok ? 'sent' : 'failed',
    error_message: res.ok ? null : JSON.stringify(resBody),
  })
```
Replace with:
```ts
  // Log to email_send_log
  await supabase.from('email_send_log').insert({
    message_id: resBody.id || crypto.randomUUID(),
    template_name: templateName,
    recipient_email: to,
    status: res.ok ? 'sent' : 'failed',
    error_message: res.ok ? null : JSON.stringify(resBody),
    metadata,
  })
```

(Every existing caller omits `metadata` entirely, so `body.metadata` is `undefined`, the `if` guard is skipped, `metadata` stays `null`, and the insert sets the column to `null` exactly as it already defaults to today — no behavior change for any existing call site.)

- [ ] **Step 2: Deploy**

Use the Supabase MCP `deploy_edge_function` tool for `send-transactional-email` (check current `verify_jwt` via `list_edge_functions` first and preserve it), including the full contents of `supabase/functions/_shared/transactional-email-templates/*.ts(x)` (all 17 templates plus `registry.ts`, with Task 1's logo changes already applied) as part of the same deploy, since this function imports the whole registry.

- [ ] **Step 3: Verify**

Use `get_edge_function` to confirm deployed source matches. Verify via `mcp__supabase__execute_sql` only (no live send): confirm `email_send_log.metadata` column still accepts both `null` and a real jsonb object by checking its type in `information_schema.columns` (already jsonb, nullable — this is a read-only confirmation, not a schema change, since the column already existed unused).

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/send-transactional-email/index.ts
git commit -m "$(cat <<'EOF'
Accept and store optional metadata on send-transactional-email

email_send_log.metadata already existed but was never populated by
any caller. Accepting an optional metadata object and persisting it
lets a future caller (the new Compose feature) stamp a shared
batch_id across multiple recipient sends, so the new Sent tab can
collapse them into one thread. Existing callers that never pass
metadata are unaffected — the column stays null exactly as before.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: New `admin-compose` email template

**Files:**
- Create: `supabase/functions/_shared/transactional-email-templates/admin-compose.tsx`
- Modify: `supabase/functions/_shared/transactional-email-templates/registry.ts`

**Interfaces:**
- Consumes: the logo URL pattern from Task 1.
- Produces: a `TEMPLATES['admin-compose']` entry accepting `{ firstName?: string, subject: string, message: string }` — consumed by Tasks 5 and 6 (the two Compose UI entry points).

- [ ] **Step 1: Create the template**

```tsx
// supabase/functions/_shared/transactional-email-templates/admin-compose.tsx
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Img, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface AdminComposeProps {
  firstName?: string
  subject?: string
  message?: string
}

const AdminComposeEmail = ({ firstName, subject, message }: AdminComposeProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{subject || 'A message from Aethyx'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src="https://aethyx.space/aethyx-logo.png" width="120" alt="Aethyx" style={logo} />
        <Heading style={h1}>
          {firstName ? `Hi ${firstName},` : 'Hi,'}
        </Heading>
        <Text style={text}>
          {message || ''}
        </Text>

        <Text style={signOff}>— Kristin</Text>

        <Hr style={divider} />
        <Text style={footer}>aethyx.space</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AdminComposeEmail,
  subject: (data: Record<string, any>) => data.subject || 'A message from Aethyx',
  displayName: 'Compose (admin)',
  previewData: { firstName: 'Adam', subject: 'Quick update on your project', message: 'Just wanted to check in — everything is on track for our call next week.' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '40px 32px', maxWidth: '560px' }
const logo = { marginBottom: '20px' }
const h1 = { fontSize: '24px', fontWeight: 600, color: '#0a0a14', margin: '0 0 18px' }
const text = { fontSize: '15px', color: '#3a3a45', lineHeight: '1.7', margin: '0 0 24px', whiteSpace: 'pre-wrap' as const }
const signOff = { fontSize: '15px', color: '#0a0a14', fontWeight: 500, margin: '0 0 32px' }
const divider = { borderColor: '#eee', margin: '32px 0 16px' }
const footer = { fontSize: '12px', color: '#999', margin: 0 }
```

- [ ] **Step 2: Register it**

Current (`supabase/functions/_shared/transactional-email-templates/registry.ts`):
```ts
import { template as bountyApproved } from './bounty-approved.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
```
Replace with:
```ts
import { template as bountyApproved } from './bounty-approved.tsx'
import { template as adminCompose } from './admin-compose.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
```
Current (last entry in the object):
```ts
  'bounty-approved': bountyApproved,
}
```
Replace with:
```ts
  'bounty-approved': bountyApproved,
  'admin-compose': adminCompose,
}
```

- [ ] **Step 3: Deploy**

Same deploy as Task 2 (this file is part of the same registry import graph) — if Task 2 hasn't been deployed yet, deploy `send-transactional-email` now including this new template file; if it was already deployed, redeploy including this addition.

- [ ] **Step 4: Verify**

Read the new file back to confirm brace/paren balance (same method as Task 1). Confirm via `get_edge_function` that the deployed `registry.ts` includes the new `admin-compose` entry.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/transactional-email-templates/admin-compose.tsx supabase/functions/_shared/transactional-email-templates/registry.ts
git commit -m "$(cat <<'EOF'
Add admin-compose email template

New template rendering an admin-authored subject + free-form message
inside the same branded wrapper (logo, signature, footer) every other
template uses — backs the new Compose feature (Inbox + ClientDetail
entry points, next tasks).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: "Sent" tab on the Inbox page

**Files:**
- Modify: `src/pages/admin/Inbox.tsx`

**Interfaces:**
- Consumes: `email_send_log` (`id, message_id, template_name, recipient_email, status, metadata, created_at`), `TEMPLATES` display names are not directly queryable from the frontend — use `template_name` as the display label directly (e.g. `new-invoice`) since the frontend has no access to the Deno-only registry; acceptable per spec (no requirement to prettify the name here).
- Produces: nothing consumed by later tasks — independent of Tasks 5/6's Compose UI beyond both reading/writing the same `email_send_log`/`metadata.batch_id` shape.

- [ ] **Step 1: Add tab state and the Sent-log fetch**

Current (`src/pages/admin/Inbox.tsx`, imports and state):
```tsx
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
```
Replace with:
```tsx
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Send, Loader2, Inbox as InboxIcon, ChevronDown, ChevronUp } from "lucide-react";
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
```

- [ ] **Step 2: Add the fetch function and grouping logic**

Add this function right after the existing `load` function (immediately before `useEffect(() => { load(); ...`):
```tsx
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
```

Current:
```tsx
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
```
Replace with:
```tsx
  useEffect(() => {
    load();
    loadSent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
```

Add this derived grouping right after the existing `const needsReply = ...` line:
```tsx
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
```

- [ ] **Step 3: Wrap the page body in Tabs, add the Sent tab content**

Current (`src/pages/admin/Inbox.tsx`, the return statement's opening):
```tsx
  return (
    <div>
      <h1 className="text-2xl font-display tracking-wider mb-6 flex items-center gap-2">
        <InboxIcon className="h-6 w-6 text-primary" /> Inbox
      </h1>

      {clients.length === 0 ? (
```
Replace with:
```tsx
  return (
    <div>
      <h1 className="text-2xl font-display tracking-wider mb-6 flex items-center gap-2">
        <InboxIcon className="h-6 w-6 text-primary" /> Inbox
      </h1>

      <Tabs defaultValue="messages">
        <TabsList className="mb-4">
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="sent">Sent</TabsTrigger>
        </TabsList>

        <TabsContent value="messages">
      {clients.length === 0 ? (
```

Current (the closing of the messages view, right before the component's final closing):
```tsx
        </div>
      )}
    </div>
  );
};

export default Inbox;
```
Replace with:
```tsx
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
                      onClick={() => setExpandedGroup(isExpanded ? null : group.key)}
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
                          <div key={email.id} className="flex items-center justify-between text-xs">
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
    </div>
  );
};

export default Inbox;
```

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit -p .
npx eslint src/pages/admin/Inbox.tsx
npm run dev
```
Manually verify via `mcp__supabase__execute_sql`: insert two test `email_send_log` rows sharing the same `metadata: {"batch_id": "test-batch-1"}` and one row with `metadata: null`, confirm the grouping logic (re-derive manually) would produce exactly 2 groups (one with 2 emails, one with 1), then delete the test rows.

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/Inbox.tsx
git commit -m "$(cat <<'EOF'
Add Sent tab to the admin Inbox page

New tabbed layout (Messages / Sent) — Sent reads email_send_log,
grouping rows sharing a metadata.batch_id into one collapsible thread
(shows recipient count, expands to each recipient's individual
status); rows without a batch_id (every existing automated email)
render as their own single entry, unchanged from today's behavior.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Compose email from the Inbox (multi-recipient)

**Files:**
- Modify: `src/pages/admin/Inbox.tsx`

**Interfaces:**
- Consumes: `admin-compose` template (Task 3), `metadata` support on `send-transactional-email` (Task 2).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Add compose state and the client-picker fetch**

Add these imports/state alongside the existing ones (after the `sentGroups` derived value block):
```tsx
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeClients, setComposeClients] = useState<{ id: string; full_name: string; first_name: string | null; email: string | null }[]>([]);
  const [composeSelectedIds, setComposeSelectedIds] = useState<string[]>([]);
  const [composeSubject, setComposeSubject] = useState("");
  const [composeMessage, setComposeMessage] = useState("");
  const [composeSending, setComposeSending] = useState(false);

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
```

- [ ] **Step 2: Add the "Compose email" button and dialog**

Current (`src/pages/admin/Inbox.tsx`, the page header):
```tsx
      <h1 className="text-2xl font-display tracking-wider mb-6 flex items-center gap-2">
        <InboxIcon className="h-6 w-6 text-primary" /> Inbox
      </h1>
```
Replace with:
```tsx
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-display tracking-wider flex items-center gap-2">
          <InboxIcon className="h-6 w-6 text-primary" /> Inbox
        </h1>
        <Button size="sm" onClick={openCompose}>
          <Send className="h-4 w-4 mr-2" /> Compose email
        </Button>
      </div>
```

Add the compose dialog right before the final `</div>` that closes the component's outermost `<div>` (i.e., immediately after the closing `</Tabs>` from Task 4, still inside the outer `<div>`):
```tsx
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Compose email</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Recipients</Label>
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
              <Label>Message</Label>
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
```

Add the new imports needed (`Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `Input`, `Label`) to the top of the file:
```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit -p .
npx eslint src/pages/admin/Inbox.tsx
npm run dev
```
Manually confirm the dialog opens, lists real clients (checking via `mcp__supabase__execute_sql` that `client_profiles` has rows with and without `email` to confirm the `disabled={!c.email}` guard works), and that `sendCompose`'s guard clauses (`composeSelectedIds.length === 0`, empty subject/message) correctly keep the Send button disabled. Do NOT trigger a real send during verification — read the code path to confirm correctness instead, consistent with this session's established no-live-email-during-verification practice; a real send is fine once Kristin uses the feature for real afterward.

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin/Inbox.tsx
git commit -m "$(cat <<'EOF'
Add multi-recipient Compose email to the Inbox page

New "Compose email" button opens a dialog with a client checkbox
multi-select (mirroring Documents.tsx's existing Share/Email action
pattern), subject, and message fields. Sends via admin-compose,
stamping one shared batch_id across all recipients so the send
collapses into a single thread in the Sent tab.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Compose email from ClientDetail (single-recipient)

**Files:**
- Modify: `src/pages/admin/ClientDetail.tsx`

**Interfaces:**
- Consumes: `admin-compose` template (Task 3), `metadata` support on `send-transactional-email` (Task 2, though a single-recipient send still gets its own `batch_id` for consistency, per the spec — it will just never visually collapse with anything else).
- Produces: nothing consumed by later tasks — final task in this plan.

- [ ] **Step 1: Add compose state and handler**

Add this state near the other dialog-related state in `ClientDetail.tsx` (find where `handleResendInvite` is defined and add the following immediately after it):
```tsx
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeSubject, setComposeSubject] = useState("");
  const [composeMessage, setComposeMessage] = useState("");
  const [composeSending, setComposeSending] = useState(false);

  const sendComposeEmail = async () => {
    if (!profile?.email || !composeSubject.trim() || !composeMessage.trim()) return;
    setComposeSending(true);
    const { data, error } = await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "admin-compose",
        recipientEmail: profile.email,
        templateData: { firstName: profile.first_name || "", subject: composeSubject.trim(), message: composeMessage.trim() },
        metadata: { batch_id: crypto.randomUUID() },
      },
    });
    setComposeSending(false);
    if (error || data?.success === false) {
      toast({ title: "Send failed", description: error?.message || "Could not send email", variant: "destructive" });
      return;
    }
    toast({ title: "Email sent" });
    setComposeOpen(false);
    setComposeSubject("");
    setComposeMessage("");
  };
```

- [ ] **Step 2: Add the "Compose email" button next to "Resend invite"**

Current (`src/pages/admin/ClientDetail.tsx`, the profile header actions row):
```tsx
          {profile.email && (
            <Button variant="outline" size="sm" onClick={handleResendInvite}>
              <Mail className="h-4 w-4 mr-2" /> Resend invite
            </Button>
          )}
```
Replace with:
```tsx
          {profile.email && (
            <Button variant="outline" size="sm" onClick={handleResendInvite}>
              <Mail className="h-4 w-4 mr-2" /> Resend invite
            </Button>
          )}
          {profile.email && (
            <Button variant="outline" size="sm" onClick={() => setComposeOpen(true)}>
              <Send className="h-4 w-4 mr-2" /> Compose email
            </Button>
          )}
```

Add `Send` to the file's existing `lucide-react` import list (check it isn't already imported before adding — this file already imports many icons from `lucide-react` per earlier work this session).

- [ ] **Step 3: Add the compose dialog**

Add this dialog anywhere alongside `ClientDetail.tsx`'s other `<Dialog>` blocks (e.g. right after the existing agreement/document dialogs, before the component's final closing tags):
```tsx
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="sm:max-w-lg" style={lightVars}>
          <DialogHeader><DialogTitle>Compose email to {profile.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Subject</Label>
              <Input value={composeSubject} onChange={(e) => setComposeSubject(e.target.value)} />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea rows={6} value={composeMessage} onChange={(e) => setComposeMessage(e.target.value)} />
            </div>
            <Button
              onClick={sendComposeEmail}
              disabled={composeSending || !composeSubject.trim() || !composeMessage.trim()}
              className="w-full"
            >
              {composeSending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Send
            </Button>
          </div>
        </DialogContent>
      </Dialog>
```

(`Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle`/`Input`/`Label`/`Textarea` are already imported in this file from earlier work this session — confirm before adding any import, don't duplicate.)

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit -p .
npx eslint src/pages/admin/ClientDetail.tsx
npm run dev
```
Confirm the button and dialog render, the Send button's disabled state correctly gates on subject/message being non-empty, and (read-only, no live send) trace that `sendComposeEmail` sends to exactly `profile.email` with a freshly generated `batch_id` each time.

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/ClientDetail.tsx
git commit -m "$(cat <<'EOF'
Add single-recipient Compose email to ClientDetail

New "Compose email" button next to the existing "Resend invite"
action, pre-filled to this one client — same admin-compose template
and metadata.batch_id mechanism as the Inbox's multi-recipient
Compose (Task 5), just skipping the client picker since there's only
ever one recipient from this entry point.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
