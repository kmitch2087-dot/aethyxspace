# Bounty Program Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let non-clients apply to become bounty (referral) partners via a public `/bounty` page, let an admin review/approve/reject applicants (including attaching a W9 file), auto-generate a referral code on approval that resolves through the existing referral-attribution function, and auto-waive the fee on any intake that resolves through a valid code (client or bounty-partner).

**Architecture:** A new `bounty_applicants` table holds public applications, fully separate from `client_profiles` (which requires a real logged-in user and can't represent a non-client applicant). `referrals.referrer_profile_id` becomes nullable with a new sibling `referrer_bounty_applicant_id` column, so a referral's referrer is either an existing client or an approved bounty partner — never both, never neither (a CHECK constraint enforces this). The existing `resolve_and_record_referral()` SECURITY DEFINER function gets a second lookup path (bounty applicant codes) instead of adding a parallel RPC, and also gains the new auto-fee-waiver behavior. Admin approval UI extends the existing `ReferralProgram.tsx` page (renamed "Bounty Program" in copy only — internal file/table/route names are unchanged, since renaming those is pure risk for no benefit).

**Tech Stack:** Vite + React + TypeScript, Supabase (Postgres + RLS + Storage + Edge Functions/Deno), shadcn/ui, Tailwind, `@react-email/components` (existing transactional email system).

## Global Constraints

- Path alias `@/` resolves to `src/`.
- Tables not yet in generated types use `(supabase as any).from("table_name")` until types are regenerated (Task 1 regenerates types immediately after the migration, so later tasks can use the real generated types).
- Every new table/policy must be properly role-scoped (`TO service_role` or `TO authenticated ... has_role(...)` or `TO anon, authenticated` with a tight `WITH CHECK`) — **never** a blanket `USING(true) WITH CHECK(true)` with no `TO` clause. This codebase has a known, separately-tracked systemic gap of exactly that anti-pattern on the existing referral/add-on tables; this plan must not add to it.
- Do not touch Stripe, billing, or the deposit/checkout flow.
- Do not modify `referral_links`'s existing schema, RLS, or code-generation logic — untouched by this plan.
- Do not wire the pre-existing dormant `referral-signed`/`referral-payout` email templates into `ReferralProgram.tsx`'s reward-marking actions — out of scope, a separate pre-existing gap.
- Every email send remains an explicit admin button click — nothing sends automatically as a side effect of a DB update (matches this app's established convention; confirmed no current code path auto-sends on a status change).
- Commit after every task, signed with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

---

### Task 1: Migration — `bounty_applicants` table, `referrals` polymorphic referrer, `client_intakes` status fix, storage bucket

**Files:**
- Create: `supabase/migrations/20260711_bounty_program_schema.sql`

**Interfaces:**
- Produces: `bounty_applicants` table, `referrals.referrer_bounty_applicant_id` column, `referrals.referrer_profile_id` now nullable, `client_intakes.status` CHECK now includes `'waived'`, `bounty-documents` storage bucket. All of Tasks 2-6 depend on these existing.

- [ ] **Step 1: Find the exact `client_intakes.status` CHECK constraint name**

Run via Supabase MCP `execute_sql`:
```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'client_intakes'::regclass AND contype = 'c';
```
Expected: one row, likely named `client_intakes_status_check` (Postgres's default auto-generated name for an unnamed column CHECK), with a definition matching `CHECK (status = ANY (ARRAY['new'::text, 'reviewing'::text, 'invoice_sent'::text, 'paid'::text, 'archived'::text]))`. Record the exact `conname` returned — use it verbatim in Step 2 (do not assume the name if the query returns something different).

- [ ] **Step 2: Write the migration**

```sql
-- Bounty applicants: public, non-client applicants for the bounty/referral program.
-- Deliberately separate from client_profiles (whose user_id is NOT NULL with no
-- existing "profile without a login" pattern anywhere in this codebase).
CREATE TABLE bounty_applicants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  relationship_note text,
  tax_ack boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  w9_file_path text,
  w9_uploaded_at timestamptz,
  code text UNIQUE,
  applied_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bounty_applicants ENABLE ROW LEVEL SECURITY;

-- Public can apply (strict caps, forced status='pending', mirrors client_intakes' pattern)
CREATE POLICY "Anyone can apply to bounty program"
  ON bounty_applicants FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    full_name IS NOT NULL
    AND email IS NOT NULL
    AND length(full_name) <= 200
    AND length(email) <= 320
    AND (phone IS NULL OR length(phone) <= 50)
    AND (relationship_note IS NULL OR length(relationship_note) <= 2000)
    AND status = 'pending'
    AND w9_file_path IS NULL
    AND code IS NULL
    AND reviewed_at IS NULL
    AND reviewed_by IS NULL
  );

CREATE POLICY "Deny public reads on bounty_applicants"
  ON bounty_applicants FOR SELECT
  TO public
  USING (false);

CREATE POLICY "Admins can manage bounty_applicants"
  ON bounty_applicants FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_bounty_applicants_updated_at
  BEFORE UPDATE ON bounty_applicants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- referrals: referrer is either an existing client OR an approved bounty applicant, never both/neither
ALTER TABLE referrals ALTER COLUMN referrer_profile_id DROP NOT NULL;
ALTER TABLE referrals ADD COLUMN referrer_bounty_applicant_id uuid REFERENCES bounty_applicants(id);
ALTER TABLE referrals ADD CONSTRAINT referrals_referrer_xor CHECK (
  (referrer_profile_id IS NOT NULL AND referrer_bounty_applicant_id IS NULL)
  OR
  (referrer_profile_id IS NULL AND referrer_bounty_applicant_id IS NOT NULL)
);

-- Fix pre-existing bug: Intakes.tsx's waiveFee() already writes status='waived',
-- but the live CHECK constraint never allowed it. This plan's auto-apply fee waiver
-- writes the same status, so this must be fixed for either path to work.
ALTER TABLE client_intakes DROP CONSTRAINT <EXACT_CONNAME_FROM_STEP_1>;
ALTER TABLE client_intakes ADD CONSTRAINT client_intakes_status_check
  CHECK (status IN ('new','reviewing','invoice_sent','paid','archived','waived'));

-- Storage: W9 files, admin-only (Kristin attaches the file after collecting it from
-- the partner however she prefers — email, DocuSign, etc. — mirrors admin-documents exactly)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('bounty-documents', 'bounty-documents', false, 52428800);

CREATE POLICY "Admins can read bounty-documents storage"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'bounty-documents' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can upload to bounty-documents storage"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'bounty-documents' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update bounty-documents storage"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'bounty-documents' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete bounty-documents storage"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'bounty-documents' AND has_role(auth.uid(), 'admin'::app_role));
```

Replace `<EXACT_CONNAME_FROM_STEP_1>` with the literal constraint name found in Step 1 before applying.

- [ ] **Step 2: Apply the migration**

Use the Supabase MCP `apply_migration` tool with `name: "bounty_program_schema"` and the SQL body above (with the constraint name substituted).

- [ ] **Step 3: Verify**

```sql
SELECT column_name, is_nullable, data_type FROM information_schema.columns
WHERE table_name = 'bounty_applicants' ORDER BY ordinal_position;

SELECT column_name, is_nullable FROM information_schema.columns
WHERE table_name = 'referrals' AND column_name IN ('referrer_profile_id', 'referrer_bounty_applicant_id');

SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid = 'referrals'::regclass AND conname = 'referrals_referrer_xor';

SELECT pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid = 'client_intakes'::regclass AND contype = 'c';

SELECT tablename, policyname, cmd, roles FROM pg_policies WHERE tablename = 'bounty_applicants';

SELECT id, public, file_size_limit FROM storage.buckets WHERE id = 'bounty-documents';
```
Expected: `bounty_applicants` has all 12 columns; `referrers_profile_id` is nullable, `referrer_bounty_applicant_id` exists and is nullable; the XOR constraint is present; `client_intakes`'s status CHECK now includes `'waived'`; exactly 3 policies on `bounty_applicants` (anon insert, deny public select, admin all) each correctly scoped (no blanket `USING(true)` with no `TO` clause); `bounty-documents` bucket exists, `public = false`.

- [ ] **Step 4: Regenerate TypeScript types**

Use the Supabase MCP `generate_typescript_types` tool, overwrite `src/integrations/supabase/types.ts`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260711_bounty_program_schema.sql src/integrations/supabase/types.ts
git commit -m "$(cat <<'EOF'
Add bounty_applicants table, polymorphic referral referrer, storage bucket

bounty_applicants holds public bounty-program applications, kept
separate from client_profiles (whose user_id is NOT NULL with no
existing null-login pattern). referrals.referrer_profile_id is now
nullable with a sibling referrer_bounty_applicant_id column, so a
referral's referrer is either a client or an approved bounty partner
(XOR-enforced). Also fixes a pre-existing bug where client_intakes'
status CHECK never allowed the 'waived' value that Intakes.tsx's
existing waiveFee() action already writes.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Extend `resolve_and_record_referral()` — bounty codes + auto fee waiver

**Files:**
- Create: `supabase/migrations/20260711_bounty_referral_resolution.sql`

**Interfaces:**
- Consumes: `bounty_applicants`, `referrals.referrer_bounty_applicant_id` (Task 1).
- Produces: updated `resolve_and_record_referral()` behavior — consumed by the existing call site `src/pages/Intake.tsx:127-137` (unchanged, no code change needed there — same RPC name/signature).

- [ ] **Step 1: Write the migration**

```sql
-- Extend the existing referral-resolution function (the only door into referrals/
-- bounty_applicants from public code) to also match bounty applicant codes, and to
-- auto-waive the intake fee when any valid code resolves.
CREATE OR REPLACE FUNCTION public.resolve_and_record_referral(
  p_code text,
  p_intake_id uuid,
  p_referred_name text,
  p_referred_email text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id uuid;
  v_bounty_applicant_id uuid;
BEGIN
  IF p_code IS NULL OR length(trim(p_code)) = 0 THEN
    RETURN;
  END IF;

  SELECT client_profile_id INTO v_referrer_id
  FROM referral_links
  WHERE code = p_code;

  IF v_referrer_id IS NOT NULL THEN
    INSERT INTO referrals (referrer_profile_id, referred_email, referred_name, status, notes)
    VALUES (v_referrer_id, p_referred_email, p_referred_name, 'pending', 'Auto-created from intake ' || p_intake_id);
  ELSE
    SELECT id INTO v_bounty_applicant_id
    FROM bounty_applicants
    WHERE code = p_code AND status = 'approved';

    IF v_bounty_applicant_id IS NULL THEN
      RETURN;
    END IF;

    INSERT INTO referrals (referrer_bounty_applicant_id, referred_email, referred_name, status, notes)
    VALUES (v_bounty_applicant_id, p_referred_email, p_referred_name, 'pending', 'Auto-created from intake ' || p_intake_id);
  END IF;

  -- Auto-apply fee waiver: only touch intakes still in their initial 'new' state,
  -- so an admin who already moved the intake forward is never silently overridden.
  UPDATE client_intakes SET status = 'waived', updated_at = now()
  WHERE id = p_intake_id AND status = 'new';
END;
$$;
```

Note: no `REVOKE`/`GRANT` statement needed — the function's signature is unchanged (`CREATE OR REPLACE` on the same name/args), so the existing grants from `20260710_referral_addons_completion.sql` still apply.

- [ ] **Step 2: Apply the migration**

Use the Supabase MCP `apply_migration` tool with `name: "bounty_referral_resolution"`.

- [ ] **Step 3: Verify with a real end-to-end test**

Run via Supabase MCP `execute_sql` (self-contained test — creates and cleans up its own rows):

```sql
DO $$
DECLARE
  v_applicant_id uuid;
  v_intake_id uuid := gen_random_uuid();
  v_referral_count int;
  v_intake_status text;
BEGIN
  -- Set up an approved bounty applicant with a code
  INSERT INTO bounty_applicants (full_name, email, status, code)
  VALUES ('Test Partner', 'test-partner@example.com', 'approved', 'TESTCODE123')
  RETURNING id INTO v_applicant_id;

  -- Set up a 'new' intake to be waived
  INSERT INTO client_intakes (id, full_name, email, status)
  VALUES (v_intake_id, 'Test Referred', 'referred@example.com', 'new');

  -- Call the function as the bounty code path would be called from Intake.tsx
  PERFORM resolve_and_record_referral('TESTCODE123', v_intake_id, 'Test Referred', 'referred@example.com');

  SELECT count(*) INTO v_referral_count FROM referrals WHERE referrer_bounty_applicant_id = v_applicant_id;
  SELECT status INTO v_intake_status FROM client_intakes WHERE id = v_intake_id;

  RAISE NOTICE 'referral rows created: %, intake status: %', v_referral_count, v_intake_status;

  -- Clean up
  DELETE FROM referrals WHERE referrer_bounty_applicant_id = v_applicant_id;
  DELETE FROM client_intakes WHERE id = v_intake_id;
  DELETE FROM bounty_applicants WHERE id = v_applicant_id;
END $$;
```
Expected: `NOTICE` output reads `referral rows created: 1, intake status: waived`. Also re-run the existing client-referral path (any existing `referral_links.code`) informally to confirm that branch still behaves identically to before (still inserts with `referrer_profile_id` set, still auto-waives).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260711_bounty_referral_resolution.sql
git commit -m "$(cat <<'EOF'
Extend resolve_and_record_referral to resolve bounty applicant codes

Falls back to bounty_applicants.code (approved only) when no
referral_links match, recording the referral against
referrer_bounty_applicant_id instead of referrer_profile_id. Also
auto-waives the intake fee (status='waived') when any valid code
resolves, but only for intakes still in their initial 'new' state.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Public `/bounty` page

**Files:**
- Create: `src/pages/Bounty.tsx`
- Modify: `src/components/Navbar.tsx:8-15` (add nav link)
- Modify: `src/App.tsx` (add route)

**Interfaces:**
- Consumes: `bounty_applicants` (Task 1, anon INSERT policy), `referral_program_settings` (existing, public-readable via `.select("*")` the same way `PortalReferrals.tsx:77` already reads it — confirm this table has no RLS blocking anon SELECT; if it does, this task's implementer must report BLOCKED rather than silently working around it, since that would be a real gap to fix, not paper over).
- Produces: nothing consumed by later tasks in this plan.

- [ ] **Step 1: Write the page**

```tsx
// src/pages/Bounty.tsx
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface ProgramSettings {
  first_reward_amount: number;
  completion_bonus_amount: number;
  tier_threshold: number;
  commission_rate: number;
  new_client_discount: number;
  eligibility_notes: string | null;
  enabled: boolean;
}

const inputClass =
  "rounded-xl bg-muted/50 border-border text-foreground placeholder:text-muted-foreground/40 focus:border-primary/40";

const Bounty = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<ProgramSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [values, setValues] = useState({
    full_name: "",
    email: "",
    phone: "",
    relationship_note: "",
  });
  const [taxAck, setTaxAck] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("referral_program_settings").select("*").limit(1).maybeSingle();
      setSettings(data as ProgramSettings | null);
      setLoadingSettings(false);
    })();
  }, []);

  const setVal = (key: keyof typeof values, v: string) => setValues((s) => ({ ...s, [key]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.full_name.trim() || !values.email.trim() || !taxAck) {
      toast({
        title: "A few fields are missing",
        description: "Please fill in your name, email, and acknowledge the tax reporting notice.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("bounty_applicants").insert({
      full_name: values.full_name.trim().slice(0, 200),
      email: values.email.trim().toLowerCase().slice(0, 320),
      phone: values.phone.trim() ? values.phone.trim().slice(0, 50) : null,
      relationship_note: values.relationship_note.trim() ? values.relationship_note.trim().slice(0, 2000) : null,
      tax_ack: taxAck,
      status: "pending",
    });
    setSubmitting(false);

    if (error) {
      console.error("Bounty application error:", error);
      toast({ title: "Submission failed", description: "Something went wrong. Please try again.", variant: "destructive" });
      return;
    }

    setSubmitted(true);
  };

  return (
    <>
      <Seo
        title="Bounty Program | Aethyx"
        description="Refer clients to Aethyx and earn cash rewards. Apply to join our bounty program."
      />
      <Navbar />
      <main className="min-h-screen pt-32 pb-24 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-display tracking-wider mb-3">Bounty Program</h1>
          <p className="text-muted-foreground text-base mb-8">
            Know a business that needs a website or ads management? Refer them to Aethyx and earn
            cash rewards when they sign on and go live.
          </p>

          {!loadingSettings && settings && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-10">
              <div className="rounded-lg border border-border/30 bg-muted/20 p-4">
                <p className="text-xs text-muted-foreground mb-1">When they sign</p>
                <p className="text-xl font-display font-bold text-primary">
                  ${Number(settings.first_reward_amount).toFixed(0)}
                </p>
              </div>
              <div className="rounded-lg border border-border/30 bg-muted/20 p-4">
                <p className="text-xs text-muted-foreground mb-1">When their project goes live</p>
                <p className="text-xl font-display font-bold text-primary">
                  +${Number(settings.completion_bonus_amount).toFixed(0)}
                </p>
              </div>
              <div className="rounded-lg border border-border/30 bg-muted/20 p-4">
                <p className="text-xs text-muted-foreground mb-1">After {settings.tier_threshold} referrals</p>
                <p className="text-xl font-display font-bold text-primary">
                  {(Number(settings.commission_rate) * 100).toFixed(0)}%
                </p>
              </div>
              <div className="rounded-lg border border-border/30 bg-muted/20 p-4">
                <p className="text-xs text-muted-foreground mb-1">They also get</p>
                <p className="text-xl font-display font-bold text-primary">
                  ${Number(settings.new_client_discount).toFixed(0)} off
                </p>
              </div>
            </div>
          )}

          {settings?.eligibility_notes && (
            <p className="text-xs text-muted-foreground leading-relaxed mb-10">{settings.eligibility_notes}</p>
          )}

          {submitted ? (
            <div className="rounded-xl border border-border/30 bg-muted/20 px-6 py-10 text-center">
              <p className="text-lg font-medium mb-2">Application received</p>
              <p className="text-sm text-muted-foreground">
                We'll review your application and follow up by email once it's approved.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="full_name">Full name</Label>
                <Input
                  id="full_name"
                  value={values.full_name}
                  onChange={(e) => setVal("full_name", e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={values.email}
                  onChange={(e) => setVal("email", e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone <span className="text-muted-foreground/50 text-xs">(optional)</span></Label>
                <Input
                  id="phone"
                  type="tel"
                  value={values.phone}
                  onChange={(e) => setVal("phone", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <Label htmlFor="relationship_note">How do you know Aethyx?</Label>
                <Textarea
                  id="relationship_note"
                  rows={3}
                  value={values.relationship_note}
                  onChange={(e) => setVal("relationship_note", e.target.value)}
                  className={inputClass}
                  placeholder="Tell us a bit about your relationship to Kristin/Aethyx…"
                />
              </div>
              <div className="flex items-start gap-2">
                <Checkbox id="tax_ack" checked={taxAck} onCheckedChange={(v) => setTaxAck(v === true)} />
                <Label htmlFor="tax_ack" className="text-xs text-muted-foreground font-normal leading-relaxed">
                  I understand that bounty rewards may be reportable income and that Aethyx may
                  request a completed W9 before any payout.
                </Label>
              </div>
              <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Apply Now
              </Button>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Bounty;
```

If `src/components/ui/checkbox.tsx` does not already exist in this repo, add it via `npx shadcn-ui@latest add checkbox` before writing the page (check first with `ls src/components/ui/checkbox.tsx`).

- [ ] **Step 2: Add the Navbar link**

In `src/components/Navbar.tsx`, add a new entry to the `links` array (around line 8-15):

```tsx
const links = [
  { to: "/", label: "Home" },
  { to: "/services", label: "Services" },
  { to: "/portfolio", label: "Portfolio" },
  { to: "/blog", label: "Blog" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
  { to: "/bounty", label: "Bounty" },
];
```

- [ ] **Step 3: Add the route**

In `src/App.tsx`, add the import near the other public page imports (after `import Contact from "./pages/Contact";`):
```tsx
import Bounty from "./pages/Bounty";
```
Add the route near the other public routes (after the `/contact` route):
```tsx
<Route path="/bounty" element={<Bounty />} />
```

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit -p .
npm run dev
```
Manually visit `/bounty` in the dev server, confirm reward figures render from `referral_program_settings`, submit the form with a test name/email + the tax-ack checkbox checked, confirm the success message appears and (via Supabase MCP `execute_sql`) a new `bounty_applicants` row exists with `status='pending'`.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Bounty.tsx src/components/Navbar.tsx src/App.tsx
git commit -m "$(cat <<'EOF'
Add public /bounty application page

New public route with reward figures pulled live from
referral_program_settings and an apply form that inserts directly
into bounty_applicants via its anon INSERT-only policy.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Admin approval UI — Applicants section in `ReferralProgram.tsx`

**Files:**
- Modify: `src/pages/admin/ReferralProgram.tsx`
- Modify: `src/pages/admin/AdminLayout.tsx:53` (nav label copy)

**Interfaces:**
- Consumes: `bounty_applicants` (Task 1).
- Produces: nothing consumed by later tasks (Task 5 adds to this same file's UI, applied after this task lands).

- [ ] **Step 1: Add state and fetch**

In `src/pages/admin/ReferralProgram.tsx`, add near the other interfaces (after the `Referral` interface, before `STATUS_OPTIONS`):

```tsx
interface BountyApplicant {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  relationship_note: string | null;
  tax_ack: boolean;
  status: "pending" | "approved" | "rejected";
  w9_file_path: string | null;
  w9_uploaded_at: string | null;
  code: string | null;
  applied_at: string;
  reviewed_at: string | null;
}
```

Add near the other `useState` declarations (after the `addSubmitting` state):

```tsx
  const [applicants, setApplicants] = useState<BountyApplicant[]>([]);
  const [applicantsLoading, setApplicantsLoading] = useState(true);
  const [applicantTab, setApplicantTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [w9UploadingId, setW9UploadingId] = useState<string | null>(null);
```

Add a fetch function near `fetchProfiles`:

```tsx
  const fetchApplicants = async () => {
    setApplicantsLoading(true);
    const { data } = await supabase
      .from("bounty_applicants")
      .select("*")
      .order("applied_at", { ascending: false });
    setApplicants((data as BountyApplicant[]) || []);
    setApplicantsLoading(false);
  };
```

Add `fetchApplicants();` to the existing `useEffect(() => { fetchSettings(); fetchReferrals(); fetchProfiles(); }, [])` block.

- [ ] **Step 2: Add W9 upload, approve, and reject handlers**

Add near the other handlers (after `handleAddReferral`):

```tsx
  const handleW9Upload = async (applicant: BountyApplicant, file: File) => {
    setW9UploadingId(applicant.id);
    const path = `${applicant.id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from("bounty-documents").upload(path, file);
    if (uploadError) {
      setW9UploadingId(null);
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      return;
    }
    const { error } = await supabase
      .from("bounty_applicants")
      .update({ w9_file_path: path, w9_uploaded_at: new Date().toISOString() })
      .eq("id", applicant.id);
    setW9UploadingId(null);
    if (error) {
      toast({ title: "Failed to save W9 reference", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "W9 attached" });
    fetchApplicants();
  };

  const generateBountyCode = () => crypto.randomUUID().replace(/-/g, "").slice(0, 12);

  const handleApproveApplicant = async (applicant: BountyApplicant) => {
    setReviewingId(applicant.id);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("bounty_applicants")
      .update({
        status: "approved",
        code: generateBountyCode(),
        reviewed_at: new Date().toISOString(),
        reviewed_by: userData.user?.id ?? null,
      })
      .eq("id", applicant.id);
    setReviewingId(null);
    if (error) {
      toast({ title: "Approval failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Applicant approved" });
    fetchApplicants();
  };

  const handleRejectApplicant = async (applicant: BountyApplicant) => {
    setReviewingId(applicant.id);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("bounty_applicants")
      .update({ status: "rejected", reviewed_at: new Date().toISOString(), reviewed_by: userData.user?.id ?? null })
      .eq("id", applicant.id);
    setReviewingId(null);
    if (error) {
      toast({ title: "Rejection failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Applicant rejected" });
    fetchApplicants();
  };
```

- [ ] **Step 3: Render the Applicants card**

Add a new `Card` between the "Program Settings" card and the "Referral Tracker" card (i.e. after the closing `</Card>` of Program Settings, before `{/* Referral Tracker */}`):

```tsx
      {/* Bounty Applicants */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Applicants</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={applicantTab} onValueChange={(v) => setApplicantTab(v as typeof applicantTab)}>
            <TabsList className="mb-4">
              <TabsTrigger value="pending">
                Pending ({applicants.filter((a) => a.status === "pending").length})
              </TabsTrigger>
              <TabsTrigger value="approved">
                Approved ({applicants.filter((a) => a.status === "approved").length})
              </TabsTrigger>
              <TabsTrigger value="rejected">
                Rejected ({applicants.filter((a) => a.status === "rejected").length})
              </TabsTrigger>
            </TabsList>
            {(["pending", "approved", "rejected"] as const).map((tab) => (
              <TabsContent key={tab} value={tab}>
                {applicantsLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : applicants.filter((a) => a.status === tab).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No applicants here.</p>
                ) : (
                  <div className="space-y-2">
                    {applicants.filter((a) => a.status === tab).map((applicant) => {
                      const isReviewing = reviewingId === applicant.id;
                      const isUploadingW9 = w9UploadingId === applicant.id;
                      return (
                        <div key={applicant.id} className="border border-border rounded-lg px-4 py-3 space-y-2">
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div>
                              <p className="text-sm font-medium">{applicant.full_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {applicant.email}{applicant.phone ? ` · ${applicant.phone}` : ""}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {applicant.status === "pending" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs px-2"
                                    disabled={isReviewing}
                                    onClick={() => handleApproveApplicant(applicant)}
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs px-2 text-destructive"
                                    disabled={isReviewing}
                                    onClick={() => handleRejectApplicant(applicant)}
                                  >
                                    Reject
                                  </Button>
                                </>
                              )}
                              {applicant.status === "approved" && applicant.code && (
                                <span className="text-xs font-mono text-muted-foreground bg-muted/50 rounded px-2 py-1">
                                  {applicant.code}
                                </span>
                              )}
                              {isReviewing && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                            </div>
                          </div>
                          {applicant.relationship_note && (
                            <p className="text-xs text-muted-foreground">{applicant.relationship_note}</p>
                          )}
                          <div className="flex items-center gap-2">
                            <Label className="text-xs shrink-0">W9:</Label>
                            {applicant.w9_file_path ? (
                              <span className="text-xs text-green-700">Attached</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">Not attached</span>
                            )}
                            <label className="text-xs text-primary cursor-pointer hover:underline">
                              {isUploadingW9 ? "Uploading…" : applicant.w9_file_path ? "Replace" : "Attach"}
                              <input
                                type="file"
                                className="hidden"
                                disabled={isUploadingW9}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleW9Upload(applicant, file);
                                  e.target.value = "";
                                }}
                              />
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
```

- [ ] **Step 4: Update page title copy and admin nav label**

Change the page header (around line 299-302) from "Referral Program" to "Bounty Program":
```tsx
        <h1 className="text-2xl font-display tracking-wider flex items-center gap-2">
          <GitFork className="h-6 w-6 text-primary" /> Bounty Program
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Manage bounty applications, rewards, settings, and track all referral activity.</p>
```

In `src/pages/admin/AdminLayout.tsx:53`, change the nav label (route/file names stay the same, copy only):
```tsx
  { title: "Bounty Program", url: "/admin/referral-program", icon: GitBranch },
```

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit -p .
npx eslint src/pages/admin/ReferralProgram.tsx
npm run dev
```
Manually visit `/admin/referral-program`, confirm the Applicants card renders (using a test row inserted via the Bounty page in Task 3, or directly via SQL), attach a test W9 file, approve it (confirm a `code` appears), reject a different test row.

- [ ] **Step 6: Commit**

```bash
git add src/pages/admin/ReferralProgram.tsx src/pages/admin/AdminLayout.tsx
git commit -m "$(cat <<'EOF'
Add admin Applicants review UI to Bounty Program page

Pending/Approved/Rejected tabs, W9 file attach (admin-authenticated
upload to the new bounty-documents bucket), and Approve/Reject actions
— approve generates a unique code. Renamed page/nav copy from
"Referral Program" to "Bounty Program" (internal file/route/table
names unchanged).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Bounty-approved email

**Files:**
- Create: `supabase/functions/_shared/transactional-email-templates/bounty-approved.tsx`
- Modify: `supabase/functions/_shared/transactional-email-templates/registry.ts`
- Create: `supabase/functions/bounty-actions/index.ts`
- Modify: `src/pages/admin/ReferralProgram.tsx` (Send approval email button)

**Interfaces:**
- Consumes: `bounty_applicants` (Task 1), the applicant-review UI from Task 4 (adds a button to the same card).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Write the email template**

```tsx
// supabase/functions/_shared/transactional-email-templates/bounty-approved.tsx
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface BountyApprovedProps {
  firstName?: string
  referralUrl?: string
}

const BountyApprovedEmail = ({
  firstName = 'there',
  referralUrl = 'https://aethyx.space/intake',
}: BountyApprovedProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You're approved for the Aethyx Bounty Program!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>You're in, {firstName}!</Heading>
        <Text style={text}>
          Your Aethyx Bounty Program application has been approved. Share the link below with
          anyone who could use a new website or ads management — when they sign on with Aethyx,
          you'll earn a reward.
        </Text>

        <Section style={linkBox}>
          <Text style={linkLabel}>YOUR BOUNTY LINK</Text>
          <Text style={linkValue}>{referralUrl}</Text>
        </Section>

        <Text style={closing}>
          Thanks for partnering with us — looking forward to your first referral.
        </Text>
        <Text style={signOff}>— Kristin</Text>

        <Hr style={divider} />
        <Text style={footer}>aethyx.space</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: BountyApprovedEmail,
  subject: `You're approved for the Aethyx Bounty Program!`,
  senderType: 'personal',
  displayName: 'Bounty approved',
  previewData: {
    firstName: 'Alex',
    referralUrl: 'https://aethyx.space/intake?ref=abc123',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '40px 32px', maxWidth: '560px' }
const h1 = { fontSize: '26px', fontWeight: 600, color: '#0a0a14', margin: '0 0 20px', letterSpacing: '-0.02em' }
const text = { fontSize: '15px', color: '#3a3a45', lineHeight: '1.7', margin: '0 0 28px' }
const linkBox = { backgroundColor: '#f0fffe', border: '1px solid #00B8AC', borderRadius: '10px', padding: '20px 24px', margin: '0 0 28px', textAlign: 'center' as const }
const linkLabel = { fontSize: '10px', color: '#00B8AC', letterSpacing: '0.12em', textTransform: 'uppercase' as const, margin: '0 0 8px', fontWeight: 600 }
const linkValue = { fontSize: '15px', fontWeight: 600, color: '#0a0a14', margin: '0', wordBreak: 'break-all' as const }
const closing = { fontSize: '15px', color: '#3a3a45', lineHeight: '1.7', margin: '0 0 4px' }
const signOff = { fontSize: '15px', color: '#0a0a14', fontWeight: 500, margin: '0 0 32px' }
const divider = { borderColor: '#eee', margin: '32px 0 16px' }
const footer = { fontSize: '12px', color: '#999', margin: '0' }
```

- [ ] **Step 2: Register the template**

In `supabase/functions/_shared/transactional-email-templates/registry.ts`, add the import near the other template imports (after `import { template as addOnActivated } from './add-on-activated.tsx'`):
```ts
import { template as bountyApproved } from './bounty-approved.tsx'
```
Add to the `TEMPLATES` map (after `'add-on-activated': addOnActivated,`):
```ts
  'bounty-approved': bountyApproved,
```

- [ ] **Step 3: Write the `bounty-actions` edge function**

```typescript
// supabase/functions/bounty-actions/index.ts
// Admin-only: send the bounty-approved email for an approved applicant.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { getCors } from "../_shared/admin-cors.ts";

function json(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

Deno.serve(async (req: Request) => {
  const cors = getCors(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: userData } = await admin.auth.getUser(token);
    if (!userData.user) return json({ error: "Auth required" }, 401, cors);
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return json({ error: "Admin only" }, 403, cors);

    const body = await req.json();
    const action = String(body.action || "");
    const applicantId = String(body.applicantId || "");
    if (!applicantId) return json({ error: "applicantId required" }, 400, cors);

    if (action === "send_approval_email") {
      const { data: applicant, error: fetchErr } = await admin
        .from("bounty_applicants")
        .select("*")
        .eq("id", applicantId)
        .maybeSingle();
      if (fetchErr || !applicant) return json({ error: "Applicant not found" }, 404, cors);
      if (applicant.status !== "approved" || !applicant.code) {
        return json({ error: "Applicant is not approved yet" }, 400, cors);
      }

      const inv = await admin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "bounty-approved",
          recipientEmail: applicant.email,
          idempotencyKey: `bounty-approved-${applicantId}-${Date.now()}`,
          templateData: {
            firstName: applicant.full_name?.split(" ")[0] || "",
            referralUrl: `https://aethyx.space/intake?ref=${applicant.code}`,
          },
        },
      });
      if (inv.error) return json({ error: inv.error.message }, 500, cors);
      return json({ success: true }, 200, cors);
    }

    return json({ error: "Unknown action" }, 400, cors);
  } catch (err) {
    console.error("[bounty-actions]", err);
    return json({ error: err instanceof Error ? err.message : "Unknown" }, 500, cors);
  }
});
```

- [ ] **Step 4: Deploy the edge function**

Use the Supabase MCP `deploy_edge_function` tool for `bounty-actions`, including `_shared/admin-cors.ts` and `_shared/transactional-email-templates/` as dependency files. Confirm via `list_edge_functions` that it deployed (`status: "ACTIVE"`).

- [ ] **Step 5: Add the "Send approval email" button**

In `src/pages/admin/ReferralProgram.tsx`, add a handler near the other applicant handlers (after `handleRejectApplicant`):

```tsx
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);

  const handleSendApprovalEmail = async (applicant: BountyApplicant) => {
    setSendingEmailId(applicant.id);
    const { data, error } = await supabase.functions.invoke("bounty-actions", {
      body: { action: "send_approval_email", applicantId: applicant.id },
    });
    setSendingEmailId(null);
    if (error || !data?.success) {
      toast({ title: "Failed to send email", description: error?.message || data?.error, variant: "destructive" });
      return;
    }
    toast({ title: "Approval email sent" });
  };
```

In the applicant card's `approved`-status badge block (the `{applicant.status === "approved" && applicant.code && (...)}` block added in Task 4), add a button alongside the code display:

```tsx
                              {applicant.status === "approved" && applicant.code && (
                                <>
                                  <span className="text-xs font-mono text-muted-foreground bg-muted/50 rounded px-2 py-1">
                                    {applicant.code}
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs px-2"
                                    disabled={sendingEmailId === applicant.id}
                                    onClick={() => handleSendApprovalEmail(applicant)}
                                  >
                                    {sendingEmailId === applicant.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                                    Send approval email
                                  </Button>
                                </>
                              )}
```

- [ ] **Step 6: Verify**

```bash
npx tsc --noEmit -p .
npm run dev
```
Approve a test applicant (or use one already approved from Task 4's manual test), click "Send approval email," confirm success toast. If a real admin JWT/session is available in the verifying environment, confirm the email actually arrives (check `email_send_log` via Supabase MCP `execute_sql` for a row referencing this applicant's `idempotencyKey` prefix). If not obtainable in this environment, confirm at minimum via `list_edge_functions` that `bounty-actions` deployed successfully, and note the live-send limitation in the report (matching how prior edge-function tasks this session handled the same JWT constraint).

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/_shared/transactional-email-templates/bounty-approved.tsx supabase/functions/_shared/transactional-email-templates/registry.ts supabase/functions/bounty-actions/index.ts src/pages/admin/ReferralProgram.tsx
git commit -m "$(cat <<'EOF'
Add bounty-approved email + admin send action

New bounty-actions edge function (admin-auth-gated, matching
document-actions' pattern) sends the new bounty-approved template via
the existing send-transactional-email system. Wired to a "Send
approval email" button next to each approved applicant's code.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Client-facing rename

**Files:**
- Modify: `src/pages/portal/PortalReferrals.tsx:143,156`
- Modify: `src/pages/portal/PortalLayout.tsx:42,59`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing consumed by later tasks (final task in this plan).

- [ ] **Step 1: Rename copy in `PortalReferrals.tsx`**

Change line 143 and line 156 (both currently `<h1 className="text-2xl font-display tracking-wider mb-1">Referral Program</h1>`) to:
```tsx
<h1 className="text-2xl font-display tracking-wider mb-1">Bounty Program</h1>
```

- [ ] **Step 2: Rename nav label in `PortalLayout.tsx`**

Line 42, change:
```tsx
  { title: "Referrals", url: "/portal/referrals", icon: GitBranch },
```
to:
```tsx
  { title: "Bounty", url: "/portal/referrals", icon: GitBranch },
```
Line 59, update the matching filter string:
```tsx
    : baseNavItems.filter((item) => item.title !== "Bounty");
```
(Internal variable names `showReferrals`/`referralEnabled` and the route path `/portal/referrals` are intentionally left unchanged — copy-only rename, per the design spec.)

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit -p .
npm run dev
```
Confirm the portal nav shows "Bounty" and the page itself shows "Bounty Program" as its heading, for a client with `referral_enabled = true`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/portal/PortalReferrals.tsx src/pages/portal/PortalLayout.tsx
git commit -m "$(cat <<'EOF'
Rename client-facing referral copy to "Bounty"

Copy-only: nav label and page heading. Internal variable/route names
(showReferrals, referralEnabled, /portal/referrals) intentionally
unchanged.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
