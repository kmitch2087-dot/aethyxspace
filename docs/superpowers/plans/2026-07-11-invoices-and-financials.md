# Invoices & Financials Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admin save a new invoice as a draft without sending it, hide clutter from the admin invoice list, give clients a document-list entry with an inline "Pay Now" prompt for each invoice, and let Kristin log her own business expenses (e.g. the Claude subscription) on the Financials page for tax season.

**Architecture:** Three small additive schema changes (`client_invoices.hidden`, `client_documents.linked_invoice_id`, `financial_records.entry_type`). Stripe invoices already natively support a draft state — `create-admin-invoice` just needs a `finalize` flag to skip `finalizeInvoice()`/the email, and a new `invoice-actions` action (`finalize_and_send`) to send a previously-saved draft later. The invoice-document link is a system-generated `client_documents` row (no real file — `file_url: null`), rendered specially wherever documents already render.

**Tech Stack:** Vite + React + TypeScript, Supabase (Postgres + Edge Functions/Deno), Stripe, shadcn/ui, Tailwind.

## Global Constraints

- Every email send stays an explicit admin action — `finalize_and_send` sends exactly once, when the admin clicks it, matching the existing convention throughout this app.
- `hidden` on `client_invoices` only ever affects the admin list — never touches client-facing views.
- The invoice→document link is a metadata-only `client_documents` row (`file_url: null`, `linked_invoice_id` set) — do not attempt to generate a real PDF/file for it.
- `entry_type` on `financial_records` defaults to `'income'` so every existing row (all of which are client revenue today) is correctly classified with zero backfill ambiguity.
- Commit after every task, signed with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

---

### Task 1: Migration — `hidden`, `linked_invoice_id`, `entry_type`

**Files:**
- Create: `supabase/migrations/20260711_invoice_financials_enhancements.sql`

**Interfaces:**
- Produces: `client_invoices.hidden`, `client_documents.linked_invoice_id`, `financial_records.entry_type` — consumed by Tasks 2-5.

- [ ] **Step 1: Write the migration**

```sql
-- Save-as-draft + hide/unhide for admin invoices, invoice-linked document entries with
-- an inline pay prompt, and income/expense typing on financial_records for logging
-- business costs (e.g. the Claude subscription) alongside client revenue.
ALTER TABLE client_invoices ADD COLUMN hidden boolean NOT NULL DEFAULT false;
ALTER TABLE client_documents ADD COLUMN linked_invoice_id uuid REFERENCES client_invoices(id) ON DELETE CASCADE;
ALTER TABLE financial_records ADD COLUMN entry_type text NOT NULL DEFAULT 'income';
```

- [ ] **Step 2: Apply the migration**

Use the Supabase MCP `apply_migration` tool with `name: "invoice_financials_enhancements"`.

- [ ] **Step 3: Verify**

```sql
SELECT column_name, is_nullable, data_type, column_default FROM information_schema.columns
WHERE (table_name = 'client_invoices' AND column_name = 'hidden')
   OR (table_name = 'client_documents' AND column_name = 'linked_invoice_id')
   OR (table_name = 'financial_records' AND column_name = 'entry_type');
```
Expected: `hidden` (`boolean`, not nullable, default `false`), `linked_invoice_id` (`uuid`, nullable), `entry_type` (`text`, not nullable, default `'income'`).

- [ ] **Step 4: Regenerate TypeScript types**

Use the Supabase MCP `generate_typescript_types` tool, overwrite `src/integrations/supabase/types.ts`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260711_invoice_financials_enhancements.sql src/integrations/supabase/types.ts
git commit -m "$(cat <<'EOF'
Add hidden, linked_invoice_id, entry_type columns

client_invoices.hidden (admin-list-only visibility toggle),
client_documents.linked_invoice_id (system-generated document entries
for invoices), financial_records.entry_type (income/expense, defaults
to income so every existing row stays correctly classified).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Save as Draft + Finalize & Send

**Files:**
- Modify: `supabase/functions/create-admin-invoice/index.ts`
- Modify: `supabase/functions/invoice-actions/index.ts`
- Modify: `src/pages/admin/Invoices.tsx`

**Interfaces:**
- Consumes: `client_invoices.hidden` is unrelated to this task — no dependency. This task is otherwise self-contained (no new column dependency; the draft/finalize distinction lives entirely in Stripe's own invoice status).
- Produces: `create-admin-invoice` accepts a new `finalize: boolean` field — consumed by Task 4 (the document-link insert also happens in this function, added in that task).

- [ ] **Step 1: Add the `finalize` flag to `create-admin-invoice`**

Current (`supabase/functions/create-admin-invoice/index.ts`, full file provided for context — only the marked sections change):
```ts
    const { profileId, description, amount, daysUntilDue } = await req.json();
```
Replace with:
```ts
    const { profileId, description, amount, daysUntilDue, finalize } = await req.json();
    const shouldFinalize = finalize !== false; // default true — preserves existing "Create & send" behavior exactly
```

Current:
```ts
    const finalized = await stripe.invoices.finalizeInvoice(invoice.id);

    // Store locally
    const { data: localInv } = await admin.from("client_invoices").upsert({
      stripe_invoice_id: finalized.id,
      stripe_customer_id: customerId,
      client_profile_id: profileId,
      user_id: profile.user_id,
      invoice_number: finalized.number,
      amount_due: amt,
      amount_paid: 0,
      currency: "usd",
      status: finalized.status || "open",
      description,
      hosted_invoice_url: finalized.hosted_invoice_url,
      invoice_pdf: finalized.invoice_pdf,
      due_date: finalized.due_date ? new Date(finalized.due_date * 1000).toISOString() : null,
      email: profile.email,
    }, { onConflict: "stripe_invoice_id" }).select().single();

    // Notify client (branded email — link to portal payment page, not Stripe)
    const portalPaymentUrl = `${origin}/portal/pay/${localInv?.id || ""}`;
    await admin.functions.invoke("send-transactional-email", {
      body: {
        templateName: "new-invoice",
        recipientEmail: profile.email,
        idempotencyKey: `new-invoice-${finalized.id}`,
        templateData: {
          firstName: profile.first_name || "",
          invoiceNumber: finalized.number,
          amount: amt.toFixed(2),
          description,
          payUrl: portalPaymentUrl,
        },
      },
    });

    return new Response(JSON.stringify({
      success: true,
      invoiceId: localInv?.id,
      stripeInvoiceId: finalized.id,
      hostedUrl: finalized.hosted_invoice_url,
    }), { headers: { ...cors, "Content-Type": "application/json" } });
```
Replace with:
```ts
    const finalized = shouldFinalize ? await stripe.invoices.finalizeInvoice(invoice.id) : invoice;

    // Store locally
    const { data: localInv } = await admin.from("client_invoices").upsert({
      stripe_invoice_id: finalized.id,
      stripe_customer_id: customerId,
      client_profile_id: profileId,
      user_id: profile.user_id,
      invoice_number: finalized.number,
      amount_due: amt,
      amount_paid: 0,
      currency: "usd",
      status: finalized.status || (shouldFinalize ? "open" : "draft"),
      description,
      hosted_invoice_url: finalized.hosted_invoice_url ?? null,
      invoice_pdf: finalized.invoice_pdf ?? null,
      due_date: finalized.due_date ? new Date(finalized.due_date * 1000).toISOString() : null,
      email: profile.email,
    }, { onConflict: "stripe_invoice_id" }).select().single();

    // Notify client (branded email — link to portal payment page, not Stripe) — only
    // when actually finalizing. A draft save has nothing to notify the client about yet.
    if (shouldFinalize) {
      const portalPaymentUrl = `${origin}/portal/pay/${localInv?.id || ""}`;
      await admin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "new-invoice",
          recipientEmail: profile.email,
          idempotencyKey: `new-invoice-${finalized.id}`,
          templateData: {
            firstName: profile.first_name || "",
            invoiceNumber: finalized.number,
            amount: amt.toFixed(2),
            description,
            payUrl: portalPaymentUrl,
          },
        },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      invoiceId: localInv?.id,
      stripeInvoiceId: finalized.id,
      hostedUrl: finalized.hosted_invoice_url ?? null,
    }), { headers: { ...cors, "Content-Type": "application/json" } });
```

- [ ] **Step 2: Add a `finalize_and_send` action to `invoice-actions`**

Current (`supabase/functions/invoice-actions/index.ts`) — the function does not currently capture `origin` as its own variable (only passes it inline to `getCors`). Current:
```ts
Deno.serve(async (req) => {
  const cors = getCors(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
```
Replace with:
```ts
Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const cors = getCors(origin);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
```

Current (insert the new action block right after the `email_to_client` block ends, before the final fallthrough):
```ts
      if (inv.error) return j({ error: inv.error.message }, 500, cors);
      return j({ success: true }, 200, cors);
    }

    return j({ error: "Unknown action" }, 400, cors);
```
Replace with:
```ts
      if (inv.error) return j({ error: inv.error.message }, 500, cors);
      return j({ success: true }, 200, cors);
    }

    if (action === "finalize_and_send") {
      if (!sid) return j({ error: "Not a Stripe invoice" }, 400, cors);
      if (row.status !== "draft") return j({ error: "Invoice is not a draft" }, 400, cors);

      const finalized = await stripe.invoices.finalizeInvoice(sid);
      await syncRow(admin, row.id, finalized);

      if (row.email) {
        let recipientName = "";
        if (row.client_profile_id) {
          const { data: p } = await admin.from("client_profiles").select("first_name").eq("id", row.client_profile_id).maybeSingle();
          recipientName = p?.first_name || "";
        }
        const portalPaymentUrl = `${origin}/portal/pay/${row.id}`;
        await admin.functions.invoke("send-transactional-email", {
          body: {
            templateName: "new-invoice",
            recipientEmail: row.email,
            idempotencyKey: `new-invoice-${finalized.id}`,
            templateData: {
              firstName: recipientName,
              invoiceNumber: finalized.number,
              amount: Number(row.amount_due || 0).toFixed(2),
              description: row.description || "",
              payUrl: portalPaymentUrl,
            },
          },
        });
      }
      return j({ success: true }, 200, cors);
    }

    return j({ error: "Unknown action" }, 400, cors);
```

- [ ] **Step 3: Deploy both edge functions**

Use the Supabase MCP `deploy_edge_function` tool for both `create-admin-invoice` and `invoice-actions` (check `list_edge_functions` first for their current `verify_jwt` setting and file-path convention, matching prior deploys of these functions in this repo). Confirm via `list_edge_functions` that both versions incremented.

- [ ] **Step 4: Add the two-button UI to the "New Invoice" dialog**

Current (`src/pages/admin/Invoices.tsx:84-97`):
```tsx
  const handleCreate = async () => {
    if (!profileId || !description.trim() || !amount) return;
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("create-admin-invoice", {
      body: { profileId, description: description.trim(), amount: Number(amount), daysUntilDue: Number(daysUntilDue) || 14 },
    });
    setSubmitting(false);
    if (error || !data?.success) {
      toast({ title: "Failed to create invoice", description: data?.error || error?.message, variant: "destructive" }); return;
    }
    toast({ title: "Invoice created", description: "Client has been notified by email." });
    setCreateOpen(false); setDescription(""); setAmount(""); setProfileId("");
    fetchAll();
  };
```
Replace with:
```tsx
  const handleCreate = async (finalize: boolean) => {
    if (!profileId || !description.trim() || !amount) return;
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("create-admin-invoice", {
      body: { profileId, description: description.trim(), amount: Number(amount), daysUntilDue: Number(daysUntilDue) || 14, finalize },
    });
    setSubmitting(false);
    if (error || !data?.success) {
      toast({ title: "Failed to create invoice", description: data?.error || error?.message, variant: "destructive" }); return;
    }
    toast({
      title: finalize ? "Invoice created" : "Draft saved",
      description: finalize ? "Client has been notified by email." : "Not sent yet — finalize and send when ready.",
    });
    setCreateOpen(false); setDescription(""); setAmount(""); setProfileId("");
    fetchAll();
  };
```

Current (`src/pages/admin/Invoices.tsx:266-268`):
```tsx
            <Button onClick={handleCreate} disabled={submitting || !profileId || !description.trim() || !amount} className="w-full">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Create & send
            </Button>
```
Replace with:
```tsx
            <div className="flex gap-2">
              <Button
                onClick={() => handleCreate(false)}
                disabled={submitting || !profileId || !description.trim() || !amount}
                variant="outline"
                className="flex-1"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Save as draft
              </Button>
              <Button onClick={() => handleCreate(true)} disabled={submitting || !profileId || !description.trim() || !amount} className="flex-1">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Create & send
              </Button>
            </div>
```

- [ ] **Step 5: Add "Finalize & Send" to the row dropdown for draft invoices**

Current (`src/pages/admin/Invoices.tsx:220-226`):
```tsx
                        {isStripe && inv.status !== "paid" && (
                          <>
                            <DropdownMenuItem onClick={() => runAction(inv, "send_reminder")}><Bell className="h-4 w-4 mr-2" /> Send Stripe reminder</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => runAction(inv, "mark_paid")}><CheckCircle2 className="h-4 w-4 mr-2" /> Mark as paid</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => runAction(inv, "void")}><XCircle className="h-4 w-4 mr-2" /> Void</DropdownMenuItem>
                          </>
                        )}
```
Replace with:
```tsx
                        {isStripe && inv.status === "draft" && (
                          <DropdownMenuItem onClick={() => runAction(inv, "finalize_and_send")}>
                            <Send className="h-4 w-4 mr-2" /> Finalize &amp; send
                          </DropdownMenuItem>
                        )}
                        {isStripe && inv.status !== "paid" && inv.status !== "draft" && (
                          <>
                            <DropdownMenuItem onClick={() => runAction(inv, "send_reminder")}><Bell className="h-4 w-4 mr-2" /> Send Stripe reminder</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => runAction(inv, "mark_paid")}><CheckCircle2 className="h-4 w-4 mr-2" /> Mark as paid</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => runAction(inv, "void")}><XCircle className="h-4 w-4 mr-2" /> Void</DropdownMenuItem>
                          </>
                        )}
```
Add `Send` to the existing `lucide-react` import list in `Invoices.tsx` (check it's not already imported before adding).

- [ ] **Step 6: Verify**

```bash
npx tsc --noEmit -p .
npx eslint src/pages/admin/Invoices.tsx
npm run dev
```
Manually create a draft invoice (Save as draft), confirm via Supabase MCP `execute_sql` that the local `client_invoices` row has `status: 'draft'` and no email was sent (no new `email_send_log` row for it — check via `execute_sql` if accessible). Then use "Finalize & send" from the dropdown, confirm the status updates to `open`/`paid` per Stripe and the client receives the `new-invoice` email this time.

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/create-admin-invoice/index.ts supabase/functions/invoice-actions/index.ts src/pages/admin/Invoices.tsx
git commit -m "$(cat <<'EOF'
Add Save as Draft + Finalize & Send for admin invoices

create-admin-invoice accepts finalize: boolean (default true, unchanged
behavior) — false skips Stripe's finalizeInvoice() and the new-invoice
email, leaving the invoice in Stripe's native draft state. A new
finalize_and_send action on invoice-actions completes a previously
saved draft later. The New Invoice dialog now has two buttons instead
of one, and draft invoices get a "Finalize & send" row action.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Hide/Unhide invoices

**Files:**
- Modify: `src/pages/admin/Invoices.tsx`

**Interfaces:**
- Consumes: `client_invoices.hidden` (Task 1).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Add hidden-filter state and a toggle handler**

Add near the other state declarations (after `const [submitting, setSubmitting] = useState(false);`):
```tsx
  const [showHidden, setShowHidden] = useState(false);

  const toggleHidden = async (inv: Invoice) => {
    const { error } = await supabase.from("client_invoices").update({ hidden: !inv.hidden }).eq("id", inv.id);
    if (error) {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
      return;
    }
    fetchAll();
  };
```

Add `hidden: boolean;` to the `Invoice` interface (`src/pages/admin/Invoices.tsx:28-41`), after `client_profile_id: string | null;`:
```tsx
interface Invoice {
  id: string;
  invoice_number: string | null;
  amount_due: number;
  amount_paid: number;
  status: string;
  description: string | null;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  stripe_invoice_id: string | null;
  created_at: string;
  email: string | null;
  client_profile_id: string | null;
  hidden: boolean;
}
```
(`select("*")` in `fetchAll` already pulls this column — no query change needed.)

- [ ] **Step 2: Filter the list and add a "Show hidden" toggle**

Current (`src/pages/admin/Invoices.tsx:164-177`):
```tsx
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-display tracking-wider flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" /> Invoices
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setSyncOpen(true)}><RefreshCcw className="h-4 w-4 mr-2" /> Sync from Stripe</Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" /> New Invoice</Button>
        </div>
      </div>

      {invoices.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No invoices yet.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => {
```
Replace with:
```tsx
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-display tracking-wider flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" /> Invoices
        </h1>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setShowHidden((v) => !v)}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 mr-2"
          >
            {showHidden ? "Hide hidden" : `Show hidden (${invoices.filter((i) => i.hidden).length})`}
          </button>
          <Button variant="outline" size="sm" onClick={() => setSyncOpen(true)}><RefreshCcw className="h-4 w-4 mr-2" /> Sync from Stripe</Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" /> New Invoice</Button>
        </div>
      </div>

      {(() => {
        const visibleInvoices = showHidden ? invoices : invoices.filter((i) => !i.hidden);
        if (visibleInvoices.length === 0) {
          return <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No invoices yet.</CardContent></Card>;
        }
        return (
        <div className="space-y-2">
          {visibleInvoices.map((inv) => {
```
This introduces an IIFE wrapper (`{(() => { ... })()}`) around the existing conditional block — find where the original `invoices.length === 0 ? (...) : (<div className="space-y-2">{invoices.map(...)}</div>)` ternary's closing `)}` is (immediately before the `{/* Create */}` comment) and close the new IIFE there too:

Current closing (right before `{/* Create */}`):
```tsx
        </div>
      )}

      {/* Create */}
```
Replace with:
```tsx
        </div>
        );
      })()}

      {/* Create */}
```

- [ ] **Step 3: Add the hide/unhide action to the row dropdown**

Current (`src/pages/admin/Invoices.tsx:227-234`):
```tsx
                        {canRefund && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => { setRefundInv(inv); setRefundAmount(""); }} className="text-destructive">
                              <RotateCcw className="h-4 w-4 mr-2" /> Refund
                            </DropdownMenuItem>
                          </>
                        )}
```
Replace with:
```tsx
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => toggleHidden(inv)}>
                          {inv.hidden ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
                          {inv.hidden ? "Unhide" : "Hide"}
                        </DropdownMenuItem>
                        {canRefund && (
                          <DropdownMenuItem onClick={() => { setRefundInv(inv); setRefundAmount(""); }} className="text-destructive">
                            <RotateCcw className="h-4 w-4 mr-2" /> Refund
                          </DropdownMenuItem>
                        )}
```
Add `Eye, EyeOff` to the existing `lucide-react` import list.

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit -p .
npx eslint src/pages/admin/Invoices.tsx
npm run dev
```
Manually hide a test invoice, confirm it disappears from the default list, confirm "Show hidden (1)" reveals it, confirm "Unhide" restores default visibility. Confirm a client's own `/portal/payments` view is completely unaffected (this column is admin-list-only, `PortalPayments.tsx` doesn't need touching per this task's scope).

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/Invoices.tsx
git commit -m "$(cat <<'EOF'
Add hide/unhide toggle to the admin invoice list

New client_invoices.hidden column, admin-list-only — hidden invoices
are excluded by default with a "Show hidden (N)" toggle to reveal
them. No effect on the client's own payments view.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Invoice → document-list entry with inline Pay Now prompt

**Files:**
- Modify: `supabase/functions/create-admin-invoice/index.ts`
- Modify: `src/pages/portal/PortalDocuments.tsx`
- Modify: `src/pages/admin/ClientDetail.tsx`

**Interfaces:**
- Consumes: `client_documents.linked_invoice_id` (Task 1), `create-admin-invoice`'s existing insert flow (Task 2's `finalize`/`localInv` — this task adds one more insert after that, regardless of whether `finalize` was true or false, since either way there's now a real invoice row to link a document entry to).
- Produces: nothing consumed by later tasks (final task in this plan).

- [ ] **Step 1: Insert a `client_documents` row alongside every invoice creation**

In `supabase/functions/create-admin-invoice/index.ts`, add this right after the `client_invoices` upsert (after the closing `.select().single();` line, before the `if (shouldFinalize)` email block added in Task 2):
```ts
    // System-generated document-list entry — no real file, just a pointer so the
    // invoice shows up in the client's Documents list with an inline pay prompt.
    if (localInv?.id) {
      await admin.from("client_documents").insert({
        client_profile_id: profileId,
        user_id: profile.user_id,
        title: `Invoice ${finalized.number || ""}`.trim(),
        file_url: null,
        uploaded_by: "admin",
        linked_invoice_id: localInv.id,
      });
    }
```

- [ ] **Step 2: Redeploy `create-admin-invoice`**

Use the Supabase MCP `deploy_edge_function` tool (same settings as Task 2's deploy). Confirm version incremented via `list_edge_functions`.

- [ ] **Step 3: Render the invoice-linked branch in `PortalDocuments.tsx`**

Add a query for linked invoices alongside the existing documents fetch. Current (`src/pages/portal/PortalDocuments.tsx:85-95`):
```tsx
    // Fetch shared documents
    const filter = profileId
      ? `client_profile_id.eq.${profileId},user_id.eq.${user.id}`
      : `user_id.eq.${user.id}`;
    const { data } = await supabase
      .from("client_documents")
      .select("*")
      .or(filter)
      .order("created_at", { ascending: false });
    setDocuments(data || []);
    setLoading(false);
```
Replace with:
```tsx
    // Fetch shared documents
    const filter = profileId
      ? `client_profile_id.eq.${profileId},user_id.eq.${user.id}`
      : `user_id.eq.${user.id}`;
    const { data } = await supabase
      .from("client_documents")
      .select("*")
      .or(filter)
      .order("created_at", { ascending: false });
    const docRows = data || [];
    setDocuments(docRows);

    // Invoice-linked entries need their invoice's amount/status for the inline pay prompt.
    const invoiceIds = docRows.filter((d: any) => d.linked_invoice_id).map((d: any) => d.linked_invoice_id);
    if (invoiceIds.length) {
      const { data: invData } = await supabase
        .from("client_invoices")
        .select("id, amount_due, status")
        .in("id", invoiceIds);
      const map: Record<string, any> = {};
      (invData || []).forEach((i) => { map[i.id] = i; });
      setLinkedInvoices(map);
    }
    setLoading(false);
```
Add the new state near the other `documents`/`profile` state (after `const [documents, setDocuments] = useState<any[]>([]);`):
```tsx
  const [linkedInvoices, setLinkedInvoices] = useState<Record<string, any>>({});
```

Current render (`src/pages/portal/PortalDocuments.tsx:352-368`):
```tsx
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 p-4 rounded-lg border border-border/30 bg-card hover:border-primary/30 transition-colors">
              <FileText className="h-5 w-5 text-primary shrink-0" />
              <button onClick={() => handleView(doc)} className="flex-1 min-w-0 text-left">
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
```
Replace with:
```tsx
          {documents.map((doc) => {
            if (doc.linked_invoice_id) {
              const inv = linkedInvoices[doc.linked_invoice_id];
              const isPaid = inv?.status === "paid";
              return (
                <div key={doc.id} className="flex items-center gap-3 p-4 rounded-lg border border-border/30 bg-card">
                  <FileText className="h-5 w-5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {inv ? `$${Number(inv.amount_due).toFixed(2)}` : ""} · {format(new Date(doc.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  {isPaid ? (
                    <span className="text-xs text-emerald-500 font-medium px-2">Paid</span>
                  ) : (
                    <Button size="sm" asChild>
                      <a href={`/portal/pay/${doc.linked_invoice_id}`}>Pay Now</a>
                    </Button>
                  )}
                </div>
              );
            }
            return (
              <div key={doc.id} className="flex items-center gap-3 p-4 rounded-lg border border-border/30 bg-card hover:border-primary/30 transition-colors">
                <FileText className="h-5 w-5 text-primary shrink-0" />
                <button onClick={() => handleView(doc)} className="flex-1 min-w-0 text-left">
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
            );
          })}
```

- [ ] **Step 4: Read-only rendering in `ClientDetail.tsx`'s admin-side document list**

Find the admin-side documents list render (search `docs.map` in `src/pages/admin/ClientDetail.tsx`). Add the same `linked_invoice_id` branch, admin-side, but without a "Pay Now" action (payment is client-only) — just show the amount/status inline as a small badge next to the title, e.g. `{doc.linked_invoice_id && <Badge variant="outline" className="text-xs ml-2">Invoice</Badge>}`. Read the existing render structure first to match its exact conventions (styling classes, existing action buttons) before inserting — this is a minor additive badge, not a structural change, so keep the diff small and follow whatever pattern is already there for per-row conditional badges in this file (e.g. the "Needs review" badge pattern already used in `Clients.tsx` is a reasonable style reference).

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit -p .
npx eslint src/pages/portal/PortalDocuments.tsx src/pages/admin/ClientDetail.tsx supabase/functions/create-admin-invoice/index.ts
npm run dev
```
Create a test invoice (draft or finalized), confirm a corresponding `client_documents` row appears with `linked_invoice_id` set and `file_url: null`. Confirm it renders in `PortalDocuments.tsx` with the amount + "Pay Now" button (linking to the correct `/portal/pay/{id}`), and that marking the invoice paid (via the existing "Mark as paid" action) flips the Documents-tab entry to show "Paid" instead of the button on next load.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/create-admin-invoice/index.ts src/pages/portal/PortalDocuments.tsx src/pages/admin/ClientDetail.tsx
git commit -m "$(cat <<'EOF'
Add invoice-linked document entries with inline Pay Now prompt

Every invoice (draft or finalized) gets a system-generated
client_documents row (no real file, just linked_invoice_id) so it
shows up in the client's Documents list alongside other shared files,
with an inline amount + "Pay Now" button reusing the existing
/portal/pay/{id} page — no new payment logic. Admin's own document
list shows a small "Invoice" badge on these rows, read-only.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Income/expense tracking on Financials

**Files:**
- Modify: `src/pages/admin/Financials.tsx`

**Interfaces:**
- Consumes: `financial_records.entry_type` (Task 1).
- Produces: nothing consumed by later tasks (final task in this plan).

- [ ] **Step 1: Add `entry_type` to the interface, form, and save payload**

Current (`src/pages/admin/Financials.tsx:20-40`):
```tsx
interface FinancialRecord {
  id: string;
  client_name: string;
  service_name: string | null;
  amount: number;
  payment_status: string;
  payment_date: string | null;
  stripe_session_id: string | null;
  notes: string | null;
  created_at: string;
}

const emptyForm = {
  client_name: "",
  service_name: "",
  amount: "",
  payment_status: "pending",
  payment_date: "",
  stripe_session_id: "",
  notes: "",
};
```
Replace with:
```tsx
interface FinancialRecord {
  id: string;
  client_name: string;
  service_name: string | null;
  amount: number;
  payment_status: string;
  payment_date: string | null;
  stripe_session_id: string | null;
  notes: string | null;
  created_at: string;
  entry_type: "income" | "expense";
}

const emptyForm = {
  client_name: "",
  service_name: "",
  amount: "",
  payment_status: "pending",
  payment_date: "",
  stripe_session_id: "",
  notes: "",
  entry_type: "income" as "income" | "expense",
};
```

Current `openEdit` (`src/pages/admin/Financials.tsx:97-109`):
```tsx
  const openEdit = (r: FinancialRecord) => {
    setEditing(r);
    setForm({
      client_name: r.client_name,
      service_name: r.service_name || "",
      amount: r.amount.toString(),
      payment_status: r.payment_status,
      payment_date: r.payment_date ? r.payment_date.split("T")[0] : "",
      stripe_session_id: r.stripe_session_id || "",
      notes: r.notes || "",
    });
    setEditorOpen(true);
  };
```
Replace with:
```tsx
  const openEdit = (r: FinancialRecord) => {
    setEditing(r);
    setForm({
      client_name: r.client_name,
      service_name: r.service_name || "",
      amount: r.amount.toString(),
      payment_status: r.payment_status,
      payment_date: r.payment_date ? r.payment_date.split("T")[0] : "",
      stripe_session_id: r.stripe_session_id || "",
      notes: r.notes || "",
      entry_type: (r.entry_type as "income" | "expense") || "income",
    });
    setEditorOpen(true);
  };
```

Current `handleSave` payload (`src/pages/admin/Financials.tsx:116-124`):
```tsx
    const payload = {
      client_name: form.client_name,
      service_name: form.service_name || null,
      amount: parseFloat(form.amount),
      payment_status: form.payment_status,
      payment_date: form.payment_date ? new Date(form.payment_date).toISOString() : null,
      stripe_session_id: form.stripe_session_id || null,
      notes: form.notes || null,
    };
```
Replace with:
```tsx
    const payload = {
      client_name: form.client_name,
      service_name: form.service_name || null,
      amount: parseFloat(form.amount),
      payment_status: form.payment_status,
      payment_date: form.payment_date ? new Date(form.payment_date).toISOString() : null,
      stripe_session_id: form.stripe_session_id || null,
      notes: form.notes || null,
      entry_type: form.entry_type,
    };
```

- [ ] **Step 2: Add the Income/Expense toggle to the add/edit dialog**

Current (`src/pages/admin/Financials.tsx:229-238`):
```tsx
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client Name *</Label>
                <Input value={form.client_name} onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Service</Label>
                <Input value={form.service_name} onChange={(e) => setForm((f) => ({ ...f, service_name: e.target.value }))} />
              </div>
            </div>
```
Replace with:
```tsx
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.entry_type} onValueChange={(v) => setForm((f) => ({ ...f, entry_type: v as "income" | "expense" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{form.entry_type === "expense" ? "Vendor *" : "Client Name *"}</Label>
                <Input
                  value={form.client_name}
                  onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))}
                  placeholder={form.entry_type === "expense" ? "e.g. Anthropic" : undefined}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Service</Label>
                <Input value={form.service_name} onChange={(e) => setForm((f) => ({ ...f, service_name: e.target.value }))} />
              </div>
            </div>
```
(This moves "Client Name"/relabeled "Vendor" into a row with the new Type selector, and gives "Service" its own row below — a minor layout reflow. `Select`/`SelectContent`/`SelectItem`/`SelectTrigger`/`SelectValue` are already imported in this file for the existing `payment_status` selector.)

- [ ] **Step 3: Add an Income/Expense filter and net-aware totals**

Add near the other state (after `const [openInvoicesCount, setOpenInvoicesCount] = useState(0);`):
```tsx
  const [entryTypeFilter, setEntryTypeFilter] = useState<"all" | "income" | "expense">("all");
```

Current derived totals (`src/pages/admin/Financials.tsx:146-147`):
```tsx
  const totalPaid = records.filter((r) => r.payment_status === "paid").reduce((s, r) => s + Number(r.amount), 0);
  const totalPending = openInvoicesTotal;
```
Replace with:
```tsx
  const filteredRecords = records.filter((r) => entryTypeFilter === "all" || r.entry_type === entryTypeFilter);
  const totalIncome = records.filter((r) => r.entry_type !== "expense" && r.payment_status === "paid").reduce((s, r) => s + Number(r.amount), 0);
  const totalExpenses = records.filter((r) => r.entry_type === "expense" && r.payment_status === "paid").reduce((s, r) => s + Number(r.amount), 0);
  const totalPaid = totalIncome - totalExpenses;
  const totalPending = openInvoicesTotal;
```

Current summary cards (`src/pages/admin/Financials.tsx:171-181`):
```tsx
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-lg border border-border/30 p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Paid</p>
          <p className="text-2xl font-bold text-emerald-400">${totalPaid.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-border/30 p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Pending (Open Invoices)</p>
          <p className="text-2xl font-bold text-yellow-400">${totalPending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-xs text-muted-foreground mt-1">{openInvoicesCount} unpaid invoice{openInvoicesCount === 1 ? "" : "s"}</p>
        </div>
      </div>
```
Replace with:
```tsx
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg border border-border/30 p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Net (Income − Expenses)</p>
          <p className="text-2xl font-bold text-emerald-400">${totalPaid.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">${totalIncome.toLocaleString()} income · ${totalExpenses.toLocaleString()} expenses</p>
        </div>
        <div className="rounded-lg border border-border/30 p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Pending (Open Invoices)</p>
          <p className="text-2xl font-bold text-yellow-400">${totalPending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-xs text-muted-foreground mt-1">{openInvoicesCount} unpaid invoice{openInvoicesCount === 1 ? "" : "s"}</p>
        </div>
        <div className="rounded-lg border border-border/30 p-4 flex flex-col justify-center">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Filter</Label>
          <Select value={entryTypeFilter} onValueChange={(v) => setEntryTypeFilter(v as typeof entryTypeFilter)}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="income">Income only</SelectItem>
              <SelectItem value="expense">Expenses only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
```

- [ ] **Step 4: Use `filteredRecords` in the table and add a Type column**

Current (`src/pages/admin/Financials.tsx:183-221`) — change every `records` reference in this block to `filteredRecords`, and add a Type column:
```tsx
      {loading ? (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : records.length === 0 ? (
        <p className="text-muted-foreground text-center py-10">No financial records yet.</p>
      ) : (
        <div className="rounded-lg border border-border/30 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead className="hidden md:table-cell">Service</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => (
```
Replace with:
```tsx
      {loading ? (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : filteredRecords.length === 0 ? (
        <p className="text-muted-foreground text-center py-10">No financial records yet.</p>
      ) : (
        <div className="rounded-lg border border-border/30 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Client / Vendor</TableHead>
                <TableHead className="hidden md:table-cell">Service</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((r) => (
```
Current row cells (`src/pages/admin/Financials.tsx:202-204`):
```tsx
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.client_name}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{r.service_name || "—"}</TableCell>
```
Replace with:
```tsx
                <TableRow key={r.id}>
                  <TableCell>
                    <span className={`text-xs px-2 py-1 rounded-full ${r.entry_type === "expense" ? "bg-red-500/20 text-red-400" : "bg-blue-500/20 text-blue-400"}`}>
                      {r.entry_type === "expense" ? "Expense" : "Income"}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">{r.client_name}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{r.service_name || "—"}</TableCell>
```

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit -p .
npx eslint src/pages/admin/Financials.tsx
npm run dev
```
Add a test expense record (e.g. "Anthropic", $20, Expense, paid), confirm it shows the red "Expense" badge, confirm the Net total correctly subtracts it, confirm the Income/Expense filter correctly narrows the list, confirm existing income records are unaffected (still show "Income" badge, still count toward the net total as before).

- [ ] **Step 6: Commit**

```bash
git add src/pages/admin/Financials.tsx
git commit -m "$(cat <<'EOF'
Add income/expense tracking to Financials

New entry_type toggle (defaults to Income) on the add/edit form, a
Type column + filter on the records list, and a Net total that
subtracts paid expenses from paid income. Lets business costs (e.g.
the Claude subscription) get logged for tax season alongside client
revenue, without a new table or an Anthropic billing integration —
manual entry, same form as before.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
