# In-App Agreement Signing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up the already-built-but-never-rendered `AgreementDocument.tsx` component into both the admin (`ClientDetail.tsx`) and client (`PortalAgreements.tsx`) sides, adding a real draft/send/sign/one-time-correction lifecycle on top of the existing `client_agreement_records` table.

**Architecture:** One migration adds `sent_at` (draft gate) and `unlock_count` (DB-enforced one-time correction cap) to `client_agreement_records`, and updates the client SELECT policy to require `sent_at IS NOT NULL`. `AgreementDocument.tsx` (the shared component) gets new buttons (client "Save Progress", client "Submit" confirmation, admin "Send to Client", admin "Unlock for Correction") and a narrow admin-only ID-photo viewer. `ClientDetail.tsx` and `PortalAgreements.tsx` each get wired to fetch/create the client's single `client_agreement_records` row and render the shared component.

**Tech Stack:** Vite + React + TypeScript, Supabase (Postgres + RLS + storage), Vitest for any pure-logic unit tests, shadcn/ui, Tailwind.

## Global Constraints

- Path alias `@/` resolves to `src/`.
- Tables not in generated types use `(supabase as any).from("table_name")` until types are regenerated (per CLAUDE.md).
- After the migration, regenerate `src/integrations/supabase/types.ts` via the Supabase MCP `generate_typescript_types` tool and overwrite the file.
- This codebase has no existing unit-test coverage for Supabase-backed pages/components (one placeholder test file exists). Do not write component tests mocking supabase-js. Verify Supabase-backed changes via `npm run dev`, `tsc --noEmit`, lint, and — where the page requires no auth or you have DB access — direct Supabase MCP `execute_sql` verification. Where an admin/portal session is required and unavailable, note it as an expected limitation rather than attempting to guess/enter credentials.
- Commit after every task using the repository's existing commit style, signed with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
- Do not touch Stripe, billing, or the deposit/checkout flow — `down_payment_status`, `stripe_checkout_session_id`, `paid_at` are out of scope and already admin/service-role-gated by the existing `protect_agreement_financial_fields` trigger.
- Do not touch `admin/Agreements.tsx`, `AgreementPopup.tsx`, or the legacy `client_agreements` table.
- Do not build the general-purpose `DocumentViewer.tsx` component — the ID-photo viewer in this plan is narrow and single-purpose only.

---

### Task 1: Migration — `sent_at`, `unlock_count`, updated client SELECT policy

**Files:**
- Create: `supabase/migrations/20260711_agreement_signing_lifecycle.sql`

**Interfaces:**
- Produces: `client_agreement_records.sent_at timestamptz` (nullable), `client_agreement_records.unlock_count integer not null default 0` with a `CHECK (unlock_count <= 1)` constraint, and an updated `car_client_own` SELECT policy requiring `sent_at IS NOT NULL`. Tasks 2-4 depend on these existing.

- [ ] **Step 1: Write the migration file**

```sql
-- Draft gate: client cannot see the agreement until admin sends it.
ALTER TABLE client_agreement_records ADD COLUMN sent_at timestamptz;

-- DB-enforced one-time-only post-signing correction. The check constraint holds even
-- against a direct SQL edit or a future UI bug, not just the admin button in AgreementDocument.tsx.
ALTER TABLE client_agreement_records ADD COLUMN unlock_count integer NOT NULL DEFAULT 0
  CHECK (unlock_count <= 1);

-- Client can only read their own agreement once it's been sent.
DROP POLICY IF EXISTS "car_client_own" ON client_agreement_records;
CREATE POLICY "car_client_own" ON client_agreement_records FOR SELECT USING (
  client_profile_id IN (SELECT id FROM client_profiles WHERE user_id = auth.uid())
  AND sent_at IS NOT NULL
);
```

- [ ] **Step 2: Apply the migration**

Use the Supabase MCP `apply_migration` tool with `name: "agreement_signing_lifecycle"` and the SQL body above.

- [ ] **Step 3: Verify**

Run via Supabase MCP `execute_sql`:

```sql
select column_name, column_default from information_schema.columns
where table_name = 'client_agreement_records' and column_name in ('sent_at', 'unlock_count');

select conname, pg_get_constraintdef(oid) from pg_constraint
where conrelid = 'client_agreement_records'::regclass and contype = 'c' and conname ilike '%unlock_count%';

select policyname, qual from pg_policies
where tablename = 'client_agreement_records' and policyname = 'car_client_own';
```

Expected: `sent_at` exists (no default), `unlock_count` exists with default `0`, the check constraint definition includes `unlock_count <= 1`, and the policy's `qual` includes `sent_at IS NOT NULL`.

Then confirm the constraint actually rejects a second unlock — run against a throwaway value, not a real row:

```sql
select 2 <= 1; -- sanity check the comparison direction; expect false
```

(A full insert/violate/rollback test isn't needed here since the constraint is a simple, well-understood `CHECK` — reserve live-row testing for Task 2's verification once real data exists.)

- [ ] **Step 4: Regenerate TypeScript types**

Use the Supabase MCP `generate_typescript_types` tool, overwrite `src/integrations/supabase/types.ts`. Confirm `client_agreement_records.Row` now includes `sent_at: string | null` and `unlock_count: number`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260711_agreement_signing_lifecycle.sql src/integrations/supabase/types.ts
git commit -m "$(cat <<'EOF'
Add draft-gate and one-time-unlock columns to agreement records

sent_at gates client visibility (draft vs sent); unlock_count with a
CHECK(<=1) constraint enforces at most one post-signing correction,
at the database level, for the life of the record.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `AgreementDocument.tsx` — new lifecycle actions

**Files:**
- Modify: `src/components/AgreementDocument.tsx` (interface at lines 7-29, state at lines 74-78, handlers at lines 175-206, ID block at lines 668-696, action buttons at lines 717-743)

**Interfaces:**
- Consumes: `sent_at`, `unlock_count` from `client_agreement_records` (Task 1).
- Produces: the enhanced `AgreementRecord` interface (`sent_at`, `unlock_count` fields) and new button behaviors — consumed by Task 3 (`ClientDetail.tsx`) and Task 4 (`PortalAgreements.tsx`), which pass `record`/`onSave`/`onSubmit` unchanged in shape (no prop signature change to the component's public interface — `onSave`/`onSubmit`/`mode`/`clientProfileId`/`clientName`/`clientEmail`/`logoUrl` all stay the same).

- [ ] **Step 1: Extend the `AgreementRecord` interface**

Current (`src/components/AgreementDocument.tsx:7-29`):

```typescript
interface AgreementRecord {
  id?: string
  client_profile_id: string
  project_scope: string
  services_included: string
  total_investment?: number
  down_payment_amount?: number
  payment_schedule: string
  timeline_start?: string
  timeline_end?: string
  revision_rounds: number
  hosting_notes: string
  additional_terms: string
  client_legal_name: string
  client_company: string
  client_address: string
  client_signature_data?: string
  client_signed_at?: string
  id_document_path?: string
  is_locked: boolean
  submitted_at?: string
  down_payment_status: string
}
```

Add two fields at the end:

```typescript
interface AgreementRecord {
  id?: string
  client_profile_id: string
  project_scope: string
  services_included: string
  total_investment?: number
  down_payment_amount?: number
  payment_schedule: string
  timeline_start?: string
  timeline_end?: string
  revision_rounds: number
  hosting_notes: string
  additional_terms: string
  client_legal_name: string
  client_company: string
  client_address: string
  client_signature_data?: string
  client_signed_at?: string
  id_document_path?: string
  is_locked: boolean
  submitted_at?: string
  down_payment_status: string
  sent_at?: string | null
  unlock_count?: number
}
```

- [ ] **Step 2: Add imports needed for the new UI**

Current imports (`src/components/AgreementDocument.tsx:1-5`):

```typescript
import { useRef, useState, useCallback, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Printer, Loader2 } from "lucide-react"
```

Change to:

```typescript
import { useRef, useState, useCallback, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Printer, Loader2, Eye } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
```

- [ ] **Step 3: Add new state**

Current state block (`src/components/AgreementDocument.tsx:74-78`):

```typescript
  const [signatureData, setSignatureData] = useState(record.client_signature_data || "")
  const [isDrawing, setIsDrawing] = useState(false)
  const [idUploaded, setIdUploaded] = useState(!!record.id_document_path)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
```

Add after it:

```typescript
  const [sending, setSending] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false)
  const [viewIdOpen, setViewIdOpen] = useState(false)
  const [viewIdUrl, setViewIdUrl] = useState<string | null>(null)
  const [viewIdLoading, setViewIdLoading] = useState(false)
```

- [ ] **Step 4: Add a client "Save Progress" handler, alongside the existing `handleSave`**

Current (`src/components/AgreementDocument.tsx:175-185`):

```typescript
  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(collectAdminFields())
      toast({ title: "Agreement saved" })
    } catch {
      toast({ title: "Save failed", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }
```

Add immediately after it:

```typescript

  const handleClientSave = async () => {
    setSaving(true)
    try {
      await onSave(collectClientFields())
      toast({ title: "Progress saved" })
    } catch {
      toast({ title: "Save failed", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleSendToClient = async () => {
    setSending(true)
    try {
      await onSave({ ...collectAdminFields(), sent_at: new Date().toISOString() })
      toast({ title: "Sent to client" })
    } catch {
      toast({ title: "Send failed", variant: "destructive" })
    } finally {
      setSending(false)
    }
  }

  const handleUnlock = async () => {
    setUnlocking(true)
    try {
      await onSave({ is_locked: false, unlock_count: (record.unlock_count ?? 0) + 1 })
      toast({ title: "Unlocked for one correction" })
    } catch {
      toast({ title: "Unlock failed", variant: "destructive" })
    } finally {
      setUnlocking(false)
    }
  }

  const handleViewId = async () => {
    if (!record.id_document_path) return
    setViewIdOpen(true)
    setViewIdLoading(true)
    const { data, error } = await supabase.storage
      .from("client-slot-docs")
      .createSignedUrl(record.id_document_path, 300)
    setViewIdLoading(false)
    if (error || !data) {
      toast({ title: "Could not load ID", description: error?.message, variant: "destructive" })
      return
    }
    setViewIdUrl(data.signedUrl)
  }
```

- [ ] **Step 5: Modify `handleSubmit` to set `is_locked: true` atomically, and add the confirmation step**

Current (`src/components/AgreementDocument.tsx:187-200`):

```typescript
  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await onSave({
        ...collectClientFields(),
        client_signature_data: signatureData,
        client_signed_at: new Date().toISOString(),
      })
      onSubmit()
    } catch {
      toast({ title: "Submission failed", variant: "destructive" })
      setSubmitting(false)
    }
  }
```

Change to:

```typescript
  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await onSave({
        ...collectClientFields(),
        client_signature_data: signatureData,
        client_signed_at: new Date().toISOString(),
        is_locked: true,
      })
      onSubmit()
    } catch {
      toast({ title: "Submission failed", variant: "destructive" })
      setSubmitting(false)
    }
  }

  const handleConfirmSubmit = () => {
    setConfirmSubmitOpen(false)
    handleSubmit()
  }
```

- [ ] **Step 6: Add the "View ID" action next to the admin/view-mode "ID Verified" checkmark**

Current ID block (`src/components/AgreementDocument.tsx:668-696`):

```tsx
            <div>
              <div className={labelClass + " mb-2"}>Photo ID / License</div>
              {mode === "client" && !record.is_locked ? (
                idUploaded || record.id_document_path ? (
                  <span className="inline-flex items-center gap-1 text-sm text-green-600 font-medium">
                    ID Verified ✓
                  </span>
                ) : (
                  <label className="cursor-pointer inline-flex items-center gap-2 text-sm border border-gray-300 rounded px-3 py-1.5 hover:bg-gray-50">
                    <span>Upload Photo ID</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) handleIdUpload(file)
                      }}
                    />
                  </label>
                )
              ) : record.id_document_path ? (
                <span className="inline-flex items-center gap-1 text-sm text-green-600 font-medium">
                  ID Verified ✓
                </span>
              ) : (
                <span className="text-gray-400 italic text-sm">Not submitted</span>
              )}
            </div>
```

Change the final `record.id_document_path ? (...)` branch (the admin/view-mode branch) to add a "View ID" button, visible only for `modeProp === "admin"`:

```tsx
            <div>
              <div className={labelClass + " mb-2"}>Photo ID / License</div>
              {mode === "client" && !record.is_locked ? (
                idUploaded || record.id_document_path ? (
                  <span className="inline-flex items-center gap-1 text-sm text-green-600 font-medium">
                    ID Verified ✓
                  </span>
                ) : (
                  <label className="cursor-pointer inline-flex items-center gap-2 text-sm border border-gray-300 rounded px-3 py-1.5 hover:bg-gray-50">
                    <span>Upload Photo ID</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) handleIdUpload(file)
                      }}
                    />
                  </label>
                )
              ) : record.id_document_path ? (
                <span className="inline-flex items-center gap-2 text-sm text-green-600 font-medium">
                  ID Verified ✓
                  {modeProp === "admin" && (
                    <button
                      type="button"
                      onClick={handleViewId}
                      className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 font-normal underline no-print"
                    >
                      <Eye className="h-3.5 w-3.5" /> View
                    </button>
                  )}
                </span>
              ) : (
                <span className="text-gray-400 italic text-sm">Not submitted</span>
              )}
            </div>
```

- [ ] **Step 7: Wire the new buttons into the action row, and add the two new dialogs**

Current action buttons block (`src/components/AgreementDocument.tsx:717-743`):

```tsx
        {/* ACTION BUTTONS */}
        <div className="no-print flex flex-wrap gap-3 mt-8 pt-6 border-t border-gray-100">
          {mode === "admin" && (
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Agreement
            </Button>
          )}

          {mode === "client" && (
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Agreement
            </Button>
          )}

          {(mode === "view" || (mode === "admin" && record.is_locked)) && (
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              Print Agreement
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
```

Change to (note: the old `mode === "admin" && record.is_locked` print condition was already unreachable dead code — `mode` is reassigned to `"view"` whenever `record.is_locked` is true, per the `const mode = record.is_locked ? "view" : modeProp` line near the top of the component — so it's simplified to `mode === "view"` alone, which covers the same real cases):

```tsx
        {/* ACTION BUTTONS */}
        <div className="no-print flex flex-wrap gap-3 mt-8 pt-6 border-t border-gray-100">
          {mode === "admin" && (
            <>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Agreement
              </Button>
              {!record.sent_at && (
                <Button variant="outline" onClick={handleSendToClient} disabled={sending}>
                  {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Send to Client
                </Button>
              )}
            </>
          )}

          {mode === "client" && (
            <>
              <Button variant="outline" onClick={handleClientSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Progress
              </Button>
              <Button
                onClick={() => setConfirmSubmitOpen(true)}
                disabled={!canSubmit || submitting}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Submit Agreement
              </Button>
            </>
          )}

          {mode === "view" && (
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              Print Agreement
            </Button>
          )}

          {modeProp === "admin" && record.is_locked && (record.unlock_count ?? 0) === 0 && (
            <Button variant="outline" onClick={handleUnlock} disabled={unlocking}>
              {unlocking && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Unlock for Correction
            </Button>
          )}
        </div>
      </div>

      <AlertDialog open={confirmSubmitOpen} onOpenChange={setConfirmSubmitOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit this agreement?</AlertDialogTitle>
            <AlertDialogDescription>
              Once submitted, this agreement is final and cannot be changed. Are you sure you
              want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSubmit}>
              Submit Agreement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={viewIdOpen} onOpenChange={(open) => { setViewIdOpen(open); if (!open) setViewIdUrl(null) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Client Photo ID</DialogTitle>
          </DialogHeader>
          {viewIdLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : viewIdUrl ? (
            record.id_document_path?.toLowerCase().endsWith(".pdf") ? (
              <iframe src={viewIdUrl} className="w-full h-[70vh] border-0" title="Client ID document" />
            ) : (
              <img src={viewIdUrl} alt="Client ID document" className="w-full h-auto rounded" />
            )
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 8: Verify**

Run:
```bash
npx tsc --noEmit -p .
npx eslint src/components/AgreementDocument.tsx
```
Expected: no new errors (this file has no prior lint baseline issues to compare against — confirm any warnings shown are about lines you didn't touch).

Since this component isn't rendered by any page until Tasks 3-4 land, there's no live page to click-test yet — confirm via `npm run dev` that the file compiles and Vite's HMR picks up the change with no errors (check the terminal/console output, not a rendered page).

- [ ] **Step 9: Commit**

```bash
git add src/components/AgreementDocument.tsx
git commit -m "$(cat <<'EOF'
Add send/submit-confirm/unlock/view-ID actions to AgreementDocument

Client gets an explicit Save Progress button and a confirmation step
before Submit (which now locks atomically with signing). Admin gets
Send to Client (lifts the draft gate) and a one-time-only Unlock for
Correction, plus a narrow ID-photo viewer for verification.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Admin — wire `ClientDetail.tsx` to the real agreement flow

**Files:**
- Modify: `src/pages/admin/ClientDetail.tsx` (imports, state near line 372, agreements tab content at lines 2713-2723, stub dialog at lines 2968-2976)

**Interfaces:**
- Consumes: `AgreementDocument` component and its `AgreementRecord` interface (Task 2).
- Produces: nothing consumed by later tasks (Task 4 is independent, both consume Task 2 only).

- [ ] **Step 1: Import `AgreementDocument`**

Near the top of `src/pages/admin/ClientDetail.tsx`, alongside the other `@/` imports (e.g. after the `projectTemplates` import), add:

```typescript
import AgreementDocument from "@/components/AgreementDocument";
```

- [ ] **Step 2: Add state and a fetch for the client's agreement record**

Find the existing `agreementDialogOpen` state declaration (`src/pages/admin/ClientDetail.tsx:372`):

```typescript
  const [agreementDialogOpen, setAgreementDialogOpen] = useState(false);
```

Add a new state for the fetched record immediately after it:

```typescript
  const [agreementDialogOpen, setAgreementDialogOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [agreementRecord, setAgreementRecord] = useState<any | null>(null);
  const [agreementRecordLoading, setAgreementRecordLoading] = useState(false);
```

Add a fetch function near the other per-tab fetch functions (e.g. near `fetchCatalog`):

```typescript
  const fetchAgreementRecord = async () => {
    if (!id) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from("client_agreement_records")
      .select("*")
      .eq("client_profile_id", id)
      .maybeSingle();
    setAgreementRecord(data);
  };
```

Call it in the same `useEffect` that already calls `fetchCatalog()`/other per-client fetches on mount (find that `useEffect([id])` block and add `fetchAgreementRecord();` alongside the existing calls).

- [ ] **Step 3: Add "Create Agreement" / "Open Agreement" trigger to the agreements tab**

Current agreements tab content (`src/pages/admin/ClientDetail.tsx:2713-2723`):

```tsx
        <TabsContent value="agreements" className="mt-4 space-y-2">
          {agreements.length === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">No agreements.</p> : agreements.map((a) => (
            <Card key={a.id}><CardContent className="pt-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{a.service_name || "Agreement"}</p>
                <p className="text-xs text-muted-foreground">{a.status} · {format(new Date(a.created_at), "MMM d, yyyy")}</p>
              </div>
              {a.amount && <span className="font-display">${Number(a.amount).toFixed(2)}</span>}
            </CardContent></Card>
          ))}
        </TabsContent>
```

Add a new section above the legacy list (the legacy list and its "No agreements." message stay exactly as-is below it):

```tsx
        <TabsContent value="agreements" className="mt-4 space-y-4">
          <div className="rounded-lg border border-border/30 p-4 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="font-medium text-sm">Service Agreement</p>
              <p className="text-xs text-muted-foreground">
                {!agreementRecord
                  ? "No agreement started yet."
                  : !agreementRecord.sent_at
                  ? "Draft — not yet sent to client."
                  : agreementRecord.is_locked
                  ? "Signed and locked."
                  : "Sent — awaiting client signature."}
              </p>
            </div>
            <Button
              size="sm"
              onClick={async () => {
                if (!agreementRecord) {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const { data, error } = await (supabase as any)
                    .from("client_agreement_records")
                    .insert({ client_profile_id: id })
                    .select("*")
                    .single();
                  if (error) {
                    toast({ title: "Could not create agreement", description: error.message, variant: "destructive" });
                    return;
                  }
                  setAgreementRecord(data);
                }
                setAgreementDialogOpen(true);
              }}
            >
              {agreementRecord ? "Open Agreement" : "Create Agreement"}
            </Button>
          </div>

          {agreements.length === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">No legacy agreements.</p> : agreements.map((a) => (
            <Card key={a.id}><CardContent className="pt-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{a.service_name || "Agreement"}</p>
                <p className="text-xs text-muted-foreground">{a.status} · {format(new Date(a.created_at), "MMM d, yyyy")}</p>
              </div>
              {a.amount && <span className="font-display">${Number(a.amount).toFixed(2)}</span>}
            </CardContent></Card>
          ))}
        </TabsContent>
```

- [ ] **Step 4: Replace the stub dialog with the real component**

Current (`src/pages/admin/ClientDetail.tsx:2968-2976`):

```tsx
      {/* Agreement */}
      <Dialog open={agreementDialogOpen} onOpenChange={setAgreementDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-white text-black" style={lightVars}>
          <DialogHeader><DialogTitle className="text-black">Edit Agreement</DialogTitle></DialogHeader>
          <div className="p-6 border border-black/10 rounded-xl bg-gray-50 text-center">
            <p className="text-sm text-muted-foreground">Agreement builder — use the AgreementDocument component</p>
          </div>
        </DialogContent>
      </Dialog>
```

Change to:

```tsx
      {/* Agreement */}
      <Dialog open={agreementDialogOpen} onOpenChange={setAgreementDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto bg-white text-black" style={lightVars}>
          <DialogHeader><DialogTitle className="text-black">Service Agreement</DialogTitle></DialogHeader>
          {agreementRecord && (
            <AgreementDocument
              record={agreementRecord}
              clientProfileId={profile.id}
              clientName={profile.full_name}
              clientEmail={profile.email || ""}
              mode="admin"
              onSave={async (updates) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { error } = await (supabase as any)
                  .from("client_agreement_records")
                  .update(updates)
                  .eq("id", agreementRecord.id);
                if (error) throw error;
                setAgreementRecord((prev: typeof agreementRecord) => prev ? { ...prev, ...updates } : prev);
              }}
              onSubmit={() => {}}
            />
          )}
        </DialogContent>
      </Dialog>
```

- [ ] **Step 5: Verify**

Run:
```bash
npx tsc --noEmit -p .
npx eslint src/pages/admin/ClientDetail.tsx
```

Since this requires an authenticated admin session, live browser click-testing may not be available in this environment. If it isn't, verify the data layer directly instead: use the Supabase MCP `execute_sql` tool to confirm a `client_agreement_records` row can be created for a real client id (`select id from client_profiles limit 1`), then clean up any row you insert for testing (delete it) unless it's meant to be a real agreement for that client — prefer creating your test row for a client you're certain has no real agreement in progress, or delete it immediately after confirming the insert/select shape works.

- [ ] **Step 6: Commit**

```bash
git add src/pages/admin/ClientDetail.tsx
git commit -m "$(cat <<'EOF'
Wire admin ClientDetail to the real agreement signing flow

Replaces the stub "use the AgreementDocument component" dialog with
the actual component, adds create/open triggers, and fetches the
client's client_agreement_records row on load.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Client — wire `PortalAgreements.tsx` to the real agreement flow

**Files:**
- Modify: `src/pages/portal/PortalAgreements.tsx` (currently the entire file, 24 lines, a static placeholder)

**Interfaces:**
- Consumes: `AgreementDocument` component (Task 2), `client_agreement_records` (visible only once `sent_at IS NOT NULL`, per Task 1's RLS policy).
- Produces: nothing consumed by later tasks (final task in this plan).

- [ ] **Step 1: Replace the placeholder with a real fetch + render**

Current full file (`src/pages/portal/PortalAgreements.tsx`):

```tsx
import { FileSignature } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const PortalAgreements = () => {
  return (
    <div>
      <h1 className="text-2xl font-display tracking-wider mb-6">Agreements</h1>

      <Card className="border-border/30">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <FileSignature className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="font-display text-lg mb-2">DocuSign Integration Coming Soon</h3>
          <p className="text-muted-foreground text-sm max-w-md">
            You'll be able to view & sign your project agreements directly from this portal. 
            We're working on connecting DocuSign for a seamless experience.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortalAgreements;
```

Replace entirely with:

```tsx
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { FileSignature, Loader2 } from "lucide-react";
import AgreementDocument from "@/components/AgreementDocument";

const PortalAgreements = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ id: string; full_name: string; email: string | null } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [record, setRecord] = useState<any | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data: profileData } = await supabase
      .from("client_profiles")
      .select("id, full_name, email")
      .eq("user_id", user.id)
      .maybeSingle();
    setProfile(profileData);

    if (profileData) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: recordData } = await (supabase as any)
        .from("client_agreement_records")
        .select("*")
        .eq("client_profile_id", profileData.id)
        .maybeSingle();
      setRecord(recordData);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!record || !profile) {
    return (
      <div>
        <h1 className="text-2xl font-display tracking-wider mb-6">Agreements</h1>
        <Card className="border-border/30">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileSignature className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="font-display text-lg mb-2">No Agreement Yet</h3>
            <p className="text-muted-foreground text-sm max-w-md">
              Your service agreement will appear here once it's ready for your review and signature.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-display tracking-wider mb-6">Agreements</h1>
      <AgreementDocument
        record={record}
        clientProfileId={profile.id}
        clientName={profile.full_name}
        clientEmail={profile.email || ""}
        mode="client"
        onSave={async (updates) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error } = await (supabase as any)
            .from("client_agreement_records")
            .update(updates)
            .eq("id", record.id);
          if (error) throw error;
          setRecord((prev: typeof record) => prev ? { ...prev, ...updates } : prev);
        }}
        onSubmit={() => load()}
      />
    </div>
  );
};

export default PortalAgreements;
```

Note: `onSubmit={() => load()}` re-fetches after a successful submission so the page immediately reflects the locked, submitted state (rather than relying on stale local state).

- [ ] **Step 2: Verify**

Run:
```bash
npx tsc --noEmit -p .
npx eslint src/pages/portal/PortalAgreements.tsx
```

This page requires an authenticated client (portal) session, which may not be available in this environment. If it isn't, verify the RLS gating directly instead: using the Supabase MCP `execute_sql` tool, confirm that a `client_agreement_records` row with `sent_at` still null is NOT selectable by a simulated client-scoped query, and one with `sent_at` set IS — e.g. compare `select count(*) from client_agreement_records where client_profile_id = '<test id>' and sent_at is not null` against a row you temporarily set `sent_at` on and then revert, rather than relying on the RLS policy text alone.

- [ ] **Step 3: Commit**

```bash
git add src/pages/portal/PortalAgreements.tsx
git commit -m "$(cat <<'EOF'
Wire client portal Agreements page to the real signing flow

Replaces the static "DocuSign Coming Soon" placeholder with a real
fetch of the client's client_agreement_records row (visible only
once sent) and renders AgreementDocument in client mode.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
