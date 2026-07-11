# Referral Access Control & Add-On Services Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the admin per-client control over referral-program access, capture "who referred you" on the public intake form and auto-link it to the referrer, and add a client-facing Add-On Services page that reuses the existing `client_add_ons` table for requests.

**Architecture:** One migration adds a `referral_enabled` flag, an intake `referral_code` column, a narrowly-scoped `SECURITY DEFINER` function that resolves a referral code into a `referrals` row, a new client-scoped INSERT policy on `client_add_ons`, and a seeded optional intake question. React changes gate existing nav/pages on the new flag, wire the intake form to the new column/function, and add one new portal page plus small admin-side additions to handle the new `requested` add-on status.

**Tech Stack:** Vite + React + TypeScript, Supabase (Postgres + RLS + Postgres functions), Vitest for pure-logic unit tests, shadcn/ui components, Tailwind.

## Global Constraints

- Path alias `@/` resolves to `src/` — use it for all new imports (per CLAUDE.md).
- Tables not in generated types must be accessed via `(supabase as any).from("table_name")` until types are regenerated (per CLAUDE.md and existing code in `ClientDetail.tsx`/`AddOns.tsx`).
- After the migration is applied, regenerate `src/integrations/supabase/types.ts` via the Supabase MCP `generate_typescript_types` tool and overwrite the file — it is auto-generated, never hand-edit it beyond this regeneration.
- This codebase has no existing unit-test coverage for Supabase-backed pages (only one placeholder test file exists). Follow that established convention: verify Supabase-backed page changes by running `npm run dev` and exercising the flow in the browser, not by writing component tests that mock `supabase-js`. Only the one pure-logic helper introduced in Task 6 gets a real Vitest unit test, since it has no Supabase dependency.
- Commit after every task using the repository's existing commit style (see `git log`), signed with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
- Do not touch Stripe, billing, or payment flows — none of this feature involves money movement, only status/request tracking (per spec).

---

### Task 1: Migration — schema, function, and RLS policy

**Files:**
- Create: `supabase/migrations/20260710_referral_addons_completion.sql`

**Interfaces:**
- Produces: `client_profiles.referral_enabled` (boolean, default false), `client_intakes.referral_code` (text, nullable), Postgres function `public.resolve_and_record_referral(p_code text, p_intake_id uuid, p_referred_name text, p_referred_email text) returns void`, new RLS policy `cao_client_request` on `client_add_ons`, and one seeded row in `intake_form_fields` with `field_key = 'referred_by_name'`. All later tasks depend on these existing.

- [ ] **Step 1: Write the migration file**

```sql
-- Referral access control: admin decides which clients see the referral program
ALTER TABLE client_profiles ADD COLUMN referral_enabled boolean NOT NULL DEFAULT false;

-- Intake referral capture: silent ?ref=CODE capture from the referral link URL
ALTER TABLE client_intakes ADD COLUMN referral_code text;

-- Resolve a referral code into a referrals row, without exposing referral_links/referrals
-- to direct anon reads or writes. This function is the only door.
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
BEGIN
  IF p_code IS NULL OR length(trim(p_code)) = 0 THEN
    RETURN;
  END IF;

  SELECT client_profile_id INTO v_referrer_id
  FROM referral_links
  WHERE code = p_code;

  IF v_referrer_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO referrals (referrer_profile_id, referred_email, referred_name, status, notes)
  VALUES (
    v_referrer_id,
    p_referred_email,
    p_referred_name,
    'pending',
    'Auto-created from intake ' || p_intake_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_and_record_referral(text, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_and_record_referral(text, uuid, text, text) TO anon, authenticated;

-- Add-on requests: let an authenticated client insert their own request row,
-- but only as an unpriced, unapproved 'requested' row — never active or priced.
CREATE POLICY "cao_client_request" ON client_add_ons FOR INSERT
TO authenticated
WITH CHECK (
  status = 'requested'
  AND price IS NULL
  AND client_profile_id IN (SELECT id FROM client_profiles WHERE user_id = auth.uid())
);

-- Visible fallback question on the intake form for people who didn't use a referral link
INSERT INTO intake_form_fields (field_key, label, help_text, field_type, options, required, section, display_order, active)
VALUES (
  'referred_by_name',
  'Who referred you to Aethyx?',
  'Optional — if a current client sent you our way, let us know who.',
  'text',
  '[]'::jsonb,
  false,
  'about',
  (SELECT COALESCE(MAX(display_order), 0) + 1 FROM intake_form_fields WHERE section = 'about'),
  true
);
```

- [ ] **Step 2: Apply the migration to the live database**

Use the Supabase MCP `apply_migration` tool with `name: "referral_addons_completion"` and the SQL body above (this project applies schema changes live via MCP rather than a local `supabase db` CLI — see recent migrations and this session's own pattern for the Stripe RLS fix).

- [ ] **Step 3: Verify the migration**

Run via Supabase MCP `execute_sql`:

```sql
select column_name from information_schema.columns
where table_name = 'client_profiles' and column_name = 'referral_enabled';

select column_name from information_schema.columns
where table_name = 'client_intakes' and column_name = 'referral_code';

select proname from pg_proc where proname = 'resolve_and_record_referral';

select policyname from pg_policies
where tablename = 'client_add_ons' and policyname = 'cao_client_request';

select field_key, label, section from intake_form_fields where field_key = 'referred_by_name';
```

Expected: each query returns exactly one row confirming the object exists.

- [ ] **Step 4: Regenerate TypeScript types**

Use the Supabase MCP `generate_typescript_types` tool and overwrite `src/integrations/supabase/types.ts` with the result. Confirm `client_profiles.Row` now includes `referral_enabled: boolean` and `client_intakes.Row` includes `referral_code: string | null`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260710_referral_addons_completion.sql src/integrations/supabase/types.ts
git commit -m "$(cat <<'EOF'
Add referral access control and add-on request schema

Adds client_profiles.referral_enabled, client_intakes.referral_code,
a SECURITY DEFINER function to resolve referral codes from the public
intake form, and an RLS policy letting clients request (not activate)
add-ons.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Admin — per-client referral access toggle

**Files:**
- Modify: `src/pages/admin/ClientDetail.tsx:47-62` (interface `Profile`), `src/pages/admin/ClientDetail.tsx:1242-1258` (profile tab content)

**Interfaces:**
- Consumes: `client_profiles.referral_enabled` column from Task 1.
- Produces: nothing consumed by later tasks (this is a leaf UI change).

- [ ] **Step 1: Add `referral_enabled` to the `Profile` interface**

In `src/pages/admin/ClientDetail.tsx`, find the `Profile` interface (currently ending with `stripe_customer_ids: string[] | null;` around line 61) and add a field:

```typescript
interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  business_name: string | null;
  billing_address: string | null;
  billing_city: string | null;
  billing_state: string | null;
  billing_zip: string | null;
  notes: string | null;
  status: string;
  source: string | null;
  stripe_customer_id: string | null;
  stripe_customer_ids: string[] | null;
  referral_enabled: boolean;
}
```

(The existing fetch at line 404 already does `.select("*")`, so no query change is needed — the new column arrives automatically once types are regenerated.)

- [ ] **Step 2: Add the import for `Switch`**

Near the top of the file, alongside the other `@/components/ui/*` imports (e.g. after the `Badge` import around line 8), add:

```typescript
import { Switch } from "@/components/ui/switch";
```

- [ ] **Step 3: Add the toggle handler**

Immediately after the existing `saveProfile` function (ends around line 545 with `else toast({ title: "Saved" });` and its closing brace), add:

```typescript
  const toggleReferralEnabled = async () => {
    if (!profile) return;
    const next = !profile.referral_enabled;
    setProfile({ ...profile, referral_enabled: next });
    const { error } = await supabase
      .from("client_profiles")
      .update({ referral_enabled: next })
      .eq("id", profile.id);
    if (error) {
      setProfile((p) => (p ? { ...p, referral_enabled: !next } : p));
      toast({ title: "Failed to update referral access", description: error.message, variant: "destructive" });
    } else {
      toast({ title: next ? "Referral access enabled" : "Referral access disabled" });
    }
  };
```

- [ ] **Step 4: Render the toggle in the Profile tab**

In the `profile` `TabsContent` block, find the closing of the "Linked Stripe customer IDs" `<div>` (it ends with `<p className="text-xs text-muted-foreground mt-2">Source: {profile.source || "—"}</p>` followed by `</div>`, just before `</CardContent>`). Add a new block right after that `</div>` and before `</CardContent>`:

```tsx
              <div className="flex items-center justify-between rounded-md border border-border/40 px-4 py-3">
                <div>
                  <Label>Referral program access</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {profile.referral_enabled
                      ? "This client can see the Referrals page and share their link."
                      : "This client cannot see the Referrals page yet."}
                  </p>
                </div>
                <Switch checked={profile.referral_enabled} onCheckedChange={toggleReferralEnabled} />
              </div>
```

- [ ] **Step 5: Manually verify in the browser**

Run `npm run dev`, open `/admin/clients/<any-client-id>`, go to the Profile tab, confirm the new "Referral program access" row renders with the switch reflecting the client's current (default `false`) state, and toggling it shows a toast and persists (reload the page and confirm the switch state survives).

- [ ] **Step 6: Commit**

```bash
git add src/pages/admin/ClientDetail.tsx
git commit -m "$(cat <<'EOF'
Add admin toggle for per-client referral program access

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Client portal — gate Referrals nav and page on the flag

**Files:**
- Modify: `src/pages/portal/PortalLayout.tsx:34-47, 102-129`
- Modify: `src/pages/portal/PortalReferrals.tsx:47-96`

**Interfaces:**
- Consumes: `client_profiles.referral_enabled` (Task 1), `PortalSidebar` component from `PortalLayout.tsx`.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Fetch `referral_enabled` alongside the existing intake check in `PortalLayout.tsx`**

In `src/pages/portal/PortalLayout.tsx`, the `useEffect` currently does:

```typescript
    // Check intake status
    supabase.from("client_profiles")
      .select("intake_required, intake_completed_at")
      .eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data && !data.intake_completed_at) setNeedsIntake(true);
      });
```

Replace it with a version that also captures `referral_enabled`, and add a new `referralEnabled` state above the `useEffect`:

```typescript
  const [needsIntake, setNeedsIntake] = useState(false);
  const [referralEnabled, setReferralEnabled] = useState(false);
```

(This replaces the existing single `const [needsIntake, setNeedsIntake] = useState(false);` line.)

```typescript
    // Check intake status and referral access
    supabase.from("client_profiles")
      .select("intake_required, intake_completed_at, referral_enabled")
      .eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data && !data.intake_completed_at) setNeedsIntake(true);
        if (data?.referral_enabled) setReferralEnabled(true);
      });
```

- [ ] **Step 2: Pass `referralEnabled` down to `PortalSidebar` and filter the nav item**

Change the `PortalSidebar` function signature and nav construction from:

```typescript
function PortalSidebar({ showIntake }: { showIntake: boolean }) {
  const navItems = showIntake
    ? [...baseNavItems, { title: "Intake Form", url: "/portal/intake", icon: ClipboardList }]
    : baseNavItems;
```

to:

```typescript
function PortalSidebar({ showIntake, showReferrals }: { showIntake: boolean; showReferrals: boolean }) {
  const filteredBase = showReferrals
    ? baseNavItems
    : baseNavItems.filter((item) => item.title !== "Referrals");
  const navItems = showIntake
    ? [...filteredBase, { title: "Intake Form", url: "/portal/intake", icon: ClipboardList }]
    : filteredBase;
```

Update the render call in `PortalLayout` from `<PortalSidebar showIntake={needsIntake} />` to:

```tsx
<PortalSidebar showIntake={needsIntake} showReferrals={referralEnabled} />
```

- [ ] **Step 3: Guard `PortalReferrals.tsx` against direct navigation when disabled**

In `src/pages/portal/PortalReferrals.tsx`, the profile fetch currently is:

```typescript
      const { data: profileData } = await supabase
        .from("client_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      const pid = profileData?.id ?? null;
```

Change the select and add a disabled flag:

```typescript
      const { data: profileData } = await supabase
        .from("client_profiles")
        .select("id, referral_enabled")
        .eq("user_id", user.id)
        .maybeSingle();

      const pid = profileData?.id ?? null;
      const enabled = profileData?.referral_enabled ?? false;
```

Then gate the auto-link-generation block. It currently is:

```typescript
      const [linkResult, settingsResult, referralsResult] = await Promise.all([
        pid
          ? supabase.from("referral_links").select("*").eq("client_profile_id", pid).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from("referral_program_settings").select("*").maybeSingle(),
        pid
          ? supabase
              .from("referrals")
              .select("*")
              .eq("referrer_profile_id", pid)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [] }),
      ]);

      let code = (linkResult.data as ReferralLink | null)?.code ?? null;
      if (!code && pid) {
        const newCode = Math.random().toString(36).slice(2, 10);
        const { data: inserted } = await supabase
          .from("referral_links")
          .insert({ client_profile_id: pid, code: newCode })
          .select("code")
          .single();
        code = inserted?.code ?? null;
      }

      setReferralCode(code);
      setSettings((settingsResult.data as ReferralProgramSettings | null));
      setReferrals((referralsResult.data as Referral[]) || []);
      setLoading(false);
```

Replace with a version that skips link generation and data fetching when `enabled` is false, and tracks the state:

```typescript
      if (!enabled) {
        setLoading(false);
        return; // hasAccess stays false; loading state below renders the disabled message
      }

      const [linkResult, settingsResult, referralsResult] = await Promise.all([
        pid
          ? supabase.from("referral_links").select("*").eq("client_profile_id", pid).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from("referral_program_settings").select("*").maybeSingle(),
        pid
          ? supabase
              .from("referrals")
              .select("*")
              .eq("referrer_profile_id", pid)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [] }),
      ]);

      let code = (linkResult.data as ReferralLink | null)?.code ?? null;
      if (!code && pid) {
        const newCode = Math.random().toString(36).slice(2, 10);
        const { data: inserted } = await supabase
          .from("referral_links")
          .insert({ client_profile_id: pid, code: newCode })
          .select("code")
          .single();
        code = inserted?.code ?? null;
      }

      setReferralCode(code);
      setSettings((settingsResult.data as ReferralProgramSettings | null));
      setReferrals((referralsResult.data as Referral[]) || []);
      setHasAccess(true);
      setLoading(false);
```

Add a new `hasAccess` state near the top of the component (alongside the other `useState` calls). Name it `hasAccess` rather than `enabled` to avoid confusion with the existing `settings?.enabled` field, which represents a different concept — the referral *program* being globally paused, not this client's individual access:

```typescript
  const [hasAccess, setHasAccess] = useState(false);
```

- [ ] **Step 4: Render a disabled state**

Right after the `if (loading) { ... }` block in `PortalReferrals.tsx`, add:

```tsx
  if (!hasAccess) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-display tracking-wider mb-1">Referral Program</h1>
        </div>
        <div className="rounded-lg border border-border/30 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
          The referral program isn't enabled for your account yet. Reach out if you'd like to
          join and start earning referral rewards.
        </div>
      </div>
    );
  }
```

Note: the `enabled` in `if (!enabled) { ... }` inside the data-loading effect (Step 3 above) is a plain local `const` scoped to that async closure — unrelated to the `hasAccess` state checked here at render time. They happen to test the same underlying condition (this client's `referral_enabled` column) but are two different bindings; do not merge them.

- [ ] **Step 5: Manually verify in the browser**

With a test client whose `referral_enabled` is `false` (the default for all existing clients after this migration), log into the portal and confirm the "Referrals" nav item is hidden and navigating directly to `/portal/referrals` shows the "not enabled" message instead of generating a link. Then flip the toggle on for that client in `ClientDetail.tsx` (Task 2), reload the portal, and confirm the nav item appears and the page behaves exactly as before (link generation, rewards, referral list).

- [ ] **Step 6: Commit**

```bash
git add src/pages/portal/PortalLayout.tsx src/pages/portal/PortalReferrals.tsx
git commit -m "$(cat <<'EOF'
Gate client portal referral page on admin-controlled access flag

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Public intake — capture referral code and record the referral

**Files:**
- Modify: `src/pages/Intake.tsx:1-2, 43-116`

**Interfaces:**
- Consumes: `client_intakes.referral_code` column and `resolve_and_record_referral` RPC (Task 1).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Import `useSearchParams`**

Change the import line:

```typescript
import { useNavigate } from "react-router-dom";
```

to:

```typescript
import { useNavigate, useSearchParams } from "react-router-dom";
```

- [ ] **Step 2: Read the `ref` query param**

Inside the `Intake` component, right after `const navigate = useNavigate();`, add:

```typescript
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get("ref");
```

- [ ] **Step 3: Include `referral_code` in the intake insert**

The existing insert is:

```typescript
    const { error } = await supabase.from("client_intakes").insert({
      id: intakeId,
      full_name: fullName,
      email: emailVal,
      phone: phoneVal,
      business_name: businessVal,
      responses,
      status: "new",
    });
```

Change it to:

```typescript
    const { error } = await supabase.from("client_intakes").insert({
      id: intakeId,
      full_name: fullName,
      email: emailVal,
      phone: phoneVal,
      business_name: businessVal,
      responses,
      status: "new",
      referral_code: referralCode || null,
    });
```

- [ ] **Step 4: Call the resolve RPC after a successful insert**

Right after the intake insert's error check (`if (error) { ... return; }`), and before the existing "Notify admin" email block, add:

```typescript
    if (referralCode) {
      supabase
        .rpc("resolve_and_record_referral", {
          p_code: referralCode,
          p_intake_id: intakeId,
          p_referred_name: fullName,
          p_referred_email: emailVal,
        })
        .then(({ error: rpcError }) => {
          if (rpcError) console.warn("Referral resolution failed:", rpcError);
        });
    }
```

This is fire-and-forget, matching the existing pattern for the notification/confirmation emails a few lines below it.

- [ ] **Step 5: Manually verify in the browser**

1. On an existing client with `referral_enabled = true` (from Task 3's verification), open `/portal/referrals`, copy the referral link (`https://<host>/intake?ref=<code>`).
2. Open that URL, fill out the intake form, submit.
3. Query via Supabase MCP `execute_sql`: `select referral_code from client_intakes order by created_at desc limit 1;` — confirm it matches the code.
4. Query: `select referrer_profile_id, referred_email, status from referrals order by created_at desc limit 1;` — confirm a new `pending` row exists pointing at the referring client's profile id.
5. Repeat with `/intake` (no `ref` param) and confirm no new `referrals` row is created, and `referral_code` is `null`.
6. Confirm the new "Who referred you to Aethyx?" question appears near the bottom of the "About you" section of the form (seeded in Task 1) and that submitting a value with it lands in `client_intakes.responses->>'referred_by_name'`.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Intake.tsx
git commit -m "$(cat <<'EOF'
Capture referral code on intake and auto-link to referrer

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Admin Intakes — show resolved referrer

**Files:**
- Modify: `src/pages/admin/Intakes.tsx:1-46, 66-95, 240-270`

**Interfaces:**
- Consumes: `client_intakes.referral_code` (Task 1), `referral_links`/`client_profiles` tables (already admin-readable, per existing `ReferralProgram.tsx` usage).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Add `referral_code` to the `Intake` type**

```typescript
type Intake = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  business_name: string | null;
  responses: Record<string, { label: string; section: string; value: string }>;
  status: IntakeStatus;
  linked_user_id: string | null;
  notes: string | null;
  created_at: string;
  referral_code: string | null;
};
```

- [ ] **Step 2: Resolve referrer names for the visible list**

Add a new state near the other `useState` calls:

```typescript
  const [referrerNames, setReferrerNames] = useState<Record<string, string>>({});
```

Update the `load` function. It currently is:

```typescript
  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("client_intakes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    } else {
      setIntakes((data || []) as unknown as Intake[]);
    }
    setLoading(false);
  };
```

Change to also resolve referrer names for any intake with a `referral_code`:

```typescript
  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("client_intakes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const rows = (data || []) as unknown as Intake[];
    setIntakes(rows);

    const codes = Array.from(new Set(rows.map((r) => r.referral_code).filter(Boolean))) as string[];
    if (codes.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: links } = await (supabase as any)
        .from("referral_links")
        .select("code, client_profile_id")
        .in("code", codes);
      const profileIds = Array.from(new Set((links || []).map((l: { client_profile_id: string }) => l.client_profile_id)));
      if (profileIds.length > 0) {
        const { data: profiles } = await supabase
          .from("client_profiles")
          .select("id, full_name")
          .in("id", profileIds);
        const profileNameById: Record<string, string> = {};
        (profiles || []).forEach((p) => { profileNameById[p.id] = p.full_name; });
        const nameByCode: Record<string, string> = {};
        (links || []).forEach((l: { code: string; client_profile_id: string }) => {
          const name = profileNameById[l.client_profile_id];
          if (name) nameByCode[l.code] = name;
        });
        setReferrerNames(nameByCode);
      }
    }
    setLoading(false);
  };
```

- [ ] **Step 3: Show the referrer in the intake detail sheet**

In the detail `Sheet`, right after the existing status `Badge` block:

```tsx
                <div>
                  <Badge className={STATUS_TONE[selected.status]}>
                    {STATUS_LABEL[selected.status]}
                  </Badge>
                </div>
```

add:

```tsx
                {selected.referral_code && referrerNames[selected.referral_code] && (
                  <div className="flex items-center gap-2 text-black/70">
                    <Gift className="h-4 w-4" /> Referred by {referrerNames[selected.referral_code]}
                  </div>
                )}
```

(`Gift` is already imported at the top of the file for the "Waive Fee" button.)

- [ ] **Step 4: Manually verify in the browser**

Reload `/admin/intakes` after the Task 4 verification steps, open the intake that was submitted with a `ref` code, and confirm "Referred by {name}" appears in the detail sheet. Open an intake submitted without a code and confirm the line doesn't render.

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/Intakes.tsx
git commit -m "$(cat <<'EOF'
Show resolved referrer name on admin intake detail

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Add-on request state helper (with unit test)

**Files:**
- Create: `src/lib/addOnRequestState.ts`
- Create: `src/lib/addOnRequestState.test.ts`

**Interfaces:**
- Produces: `computeAddOnRequestState(clientAddOns: { add_on_catalog_id: string | null; status: string }[], catalogId: string): "active" | "requested" | "requestable"` — consumed by Task 7 (`PortalAddOns.tsx`).

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/addOnRequestState.test.ts
import { describe, it, expect } from "vitest";
import { computeAddOnRequestState } from "./addOnRequestState";

describe("computeAddOnRequestState", () => {
  it("returns 'active' when the client has an active row for this catalog item", () => {
    const rows = [{ add_on_catalog_id: "catalog-1", status: "active" }];
    expect(computeAddOnRequestState(rows, "catalog-1")).toBe("active");
  });

  it("returns 'requested' when the only row is pending review", () => {
    const rows = [{ add_on_catalog_id: "catalog-1", status: "requested" }];
    expect(computeAddOnRequestState(rows, "catalog-1")).toBe("requested");
  });

  it("returns 'requestable' when there is no row for this catalog item", () => {
    const rows = [{ add_on_catalog_id: "catalog-2", status: "active" }];
    expect(computeAddOnRequestState(rows, "catalog-1")).toBe("requestable");
  });

  it("returns 'requestable' when the only row was cancelled", () => {
    const rows = [{ add_on_catalog_id: "catalog-1", status: "cancelled" }];
    expect(computeAddOnRequestState(rows, "catalog-1")).toBe("requestable");
  });

  it("prefers 'active' over 'requested' when both exist for the same item", () => {
    const rows = [
      { add_on_catalog_id: "catalog-1", status: "cancelled" },
      { add_on_catalog_id: "catalog-1", status: "requested" },
      { add_on_catalog_id: "catalog-1", status: "active" },
    ];
    expect(computeAddOnRequestState(rows, "catalog-1")).toBe("active");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/addOnRequestState.test.ts`
Expected: FAIL — `Cannot find module './addOnRequestState'` (the module doesn't exist yet).

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/addOnRequestState.ts
export type AddOnRequestState = "active" | "requested" | "requestable";

interface ClientAddOnRow {
  add_on_catalog_id: string | null;
  status: string;
}

export function computeAddOnRequestState(
  clientAddOns: ClientAddOnRow[],
  catalogId: string
): AddOnRequestState {
  const rows = clientAddOns.filter((row) => row.add_on_catalog_id === catalogId);
  if (rows.some((row) => row.status === "active")) return "active";
  if (rows.some((row) => row.status === "requested")) return "requested";
  return "requestable";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/addOnRequestState.test.ts`
Expected: PASS — all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/addOnRequestState.ts src/lib/addOnRequestState.test.ts
git commit -m "$(cat <<'EOF'
Add pure helper for computing per-client add-on request state

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Client portal — Add-On Services page

**Files:**
- Create: `src/pages/portal/PortalAddOns.tsx`
- Modify: `src/pages/portal/PortalLayout.tsx:21-42` (nav item)
- Modify: `src/App.tsx` (import + route)

**Interfaces:**
- Consumes: `computeAddOnRequestState` from Task 6, `add_on_catalog`/`client_add_ons` tables, `cao_client_request` RLS policy (Task 1).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Add the nav item**

In `src/pages/portal/PortalLayout.tsx`, add `Package` to the `lucide-react` import list (alongside `GitBranch`, `FolderKanban`, etc.):

```typescript
import {
  LayoutDashboard,
  MessageSquare,
  FolderOpen,
  FileSignature,
  CreditCard,
  ClipboardList,
  LogOut,
  GitBranch,
  FolderKanban,
  Package,
} from "lucide-react";
```

Add a new entry to `baseNavItems`, after `"Referrals"` and before `"My Project"`:

```typescript
const baseNavItems = [
  { title: "Overview", url: "/portal", icon: LayoutDashboard },
  { title: "Messages", url: "/portal/messages", icon: MessageSquare },
  { title: "Documents", url: "/portal/documents", icon: FolderOpen },
  { title: "Agreements", url: "/portal/agreements", icon: FileSignature },
  { title: "Payments", url: "/portal/payments", icon: CreditCard },
  { title: "Referrals", url: "/portal/referrals", icon: GitBranch },
  { title: "Add-Ons", url: "/portal/add-ons", icon: Package },
  { title: "My Project", url: "/portal/projects", icon: FolderKanban },
];
```

(Add-Ons is not gated by `showReferrals` — it stays visible for every client, per spec.)

- [ ] **Step 2: Write `PortalAddOns.tsx`**

```tsx
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package } from "lucide-react";
import { computeAddOnRequestState } from "@/lib/addOnRequestState";

interface CatalogItem {
  id: string;
  name: string;
  description: string | null;
  type: string;
  category: string;
  display_price: string | null;
  sort_order: number;
}

interface ClientAddOnRow {
  id: string;
  add_on_catalog_id: string | null;
  status: string;
}

const PortalAddOns = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [clientAddOns, setClientAddOns] = useState<ClientAddOnRow[]>([]);
  const [requestingId, setRequestingId] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data: profileData } = await supabase
      .from("client_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    const pid = profileData?.id ?? null;
    setProfileId(pid);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [catalogResult, addOnsResult] = await Promise.all([
      (supabase as any)
        .from("add_on_catalog")
        .select("id, name, description, type, category, display_price, sort_order")
        .eq("active", true)
        .order("sort_order"),
      pid
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? (supabase as any)
            .from("client_add_ons")
            .select("id, add_on_catalog_id, status")
            .eq("client_profile_id", pid)
        : Promise.resolve({ data: [] }),
    ]);

    setCatalog((catalogResult.data as CatalogItem[]) || []);
    setClientAddOns((addOnsResult.data as ClientAddOnRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const requestAddOn = async (catalogId: string) => {
    if (!profileId) return;
    setRequestingId(catalogId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("client_add_ons").insert({
      client_profile_id: profileId,
      add_on_catalog_id: catalogId,
      status: "requested",
      price: null,
    });
    setRequestingId(null);
    if (!error) {
      setClientAddOns((prev) => [...prev, { id: crypto.randomUUID(), add_on_catalog_id: catalogId, status: "requested" }]);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const retainers = catalog.filter((c) => c.category === "retainer");
  const projectAddOns = catalog.filter((c) => c.category === "project");

  const renderItem = (item: CatalogItem) => {
    const state = computeAddOnRequestState(clientAddOns, item.id);
    return (
      <Card key={item.id} className="border-border/30">
        <CardContent className="pt-5 space-y-2">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="font-medium text-sm">{item.name}</p>
              {item.display_price && (
                <p className="text-primary font-display text-lg mt-0.5">{item.display_price}</p>
              )}
            </div>
            {state === "active" && (
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">Active</Badge>
            )}
          </div>
          {item.description && (
            <p className="text-sm text-muted-foreground">{item.description}</p>
          )}
          {state === "requestable" && (
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              disabled={requestingId === item.id}
              onClick={() => requestAddOn(item.id)}
            >
              {requestingId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : null}
              Request this
            </Button>
          )}
          {state === "requested" && (
            <Button size="sm" variant="outline" className="mt-2" disabled>
              Requested — Kristin will follow up
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display tracking-wider mb-1 flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" /> Add-On Services
        </h1>
        <p className="text-muted-foreground text-sm">
          Extend your project with ongoing support or one-time upgrades. Request anything below
          and I'll follow up to confirm scope and pricing.
        </p>
      </div>

      {retainers.length > 0 && (
        <div>
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-4">
            Recurring Retainers
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {retainers.map(renderItem)}
          </div>
        </div>
      )}

      {projectAddOns.length > 0 && (
        <div>
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-4">
            One-Time Project Add-Ons
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projectAddOns.map(renderItem)}
          </div>
        </div>
      )}

      {catalog.length === 0 && (
        <Card className="border-border/30">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-sm">No add-on services available right now.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PortalAddOns;
```

- [ ] **Step 3: Wire the route in `App.tsx`**

Add the import alongside the other portal page imports:

```typescript
import PortalAddOns from "./pages/portal/PortalAddOns";
```

Add the route inside the `/portal` route block, after `<Route path="referrals" element={<PortalReferrals />} />`:

```tsx
              <Route path="add-ons" element={<PortalAddOns />} />
```

- [ ] **Step 4: Manually verify in the browser**

Log in as a client, open `/portal/add-ons`, confirm the catalog renders grouped into Retainers/One-Time sections matching `AddOns.tsx` admin data. Click "Request this" on an item, confirm it flips to the disabled "Requested — Kristin will follow up" state and stays that way after a page reload. In `ClientDetail.tsx` → Add-Ons tab for that same client, confirm the new row appears (Task 8 will make its status render cleanly; for now it may show a raw "requested" badge/blank price, which is expected until that task lands).

- [ ] **Step 5: Commit**

```bash
git add src/pages/portal/PortalAddOns.tsx src/pages/portal/PortalLayout.tsx src/App.tsx
git commit -m "$(cat <<'EOF'
Add client-facing Add-On Services browse/request page

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Admin — handle the `requested` add-on status

**Files:**
- Modify: `src/pages/admin/ClientDetail.tsx:110-120` (`AddOnRow` interface), `:218-221` (`formatAddonPrice`), `:673-679` (`openEditAddOn`), `:681-700` (`saveEditAddOn`), `:1660-1668` (status badges), `:2827-2836` (status select)
- Modify: `src/pages/admin/AdminLayout.tsx` (request-count badge on Clients nav item)

**Interfaces:**
- Consumes: `client_add_ons.status = 'requested'` rows created by Task 7.
- Produces: nothing consumed by later tasks (final task in the plan).

- [ ] **Step 1: Allow `price` to be `null` in `AddOnRow`**

```typescript
interface AddOnRow {
  id: string;
  client_profile_id: string;
  add_on_catalog_id: string | null;
  custom_name: string | null;
  price: number | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  catalog: {
    name: string;
    type: string;
    category: string;
    display_price: string | null;
  } | null;
}
```

This is the full existing interface with only `price` changed from `number` to `number | null` — no other fields change.

- [ ] **Step 2: Add a "Requested" badge and guard the price display**

In the add-ons list rendering (`TabsContent value="addons"`), the status badges block is:

```tsx
                            {addon.status === "active" && (
                              <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100 text-xs">Active</Badge>
                            )}
                            {addon.status === "paused" && (
                              <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100 text-xs">Paused</Badge>
                            )}
                            {addon.status === "cancelled" && (
                              <Badge className="bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-100 text-xs">Cancelled</Badge>
                            )}
```

Add a `requested` case:

```tsx
                            {addon.status === "active" && (
                              <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100 text-xs">Active</Badge>
                            )}
                            {addon.status === "requested" && (
                              <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 text-xs">Requested</Badge>
                            )}
                            {addon.status === "paused" && (
                              <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100 text-xs">Paused</Badge>
                            )}
                            {addon.status === "cancelled" && (
                              <Badge className="bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-100 text-xs">Cancelled</Badge>
                            )}
```

A few lines below, guard the price line, which currently is:

```tsx
                            <span className="font-medium">{formatAddonPrice(addon.price, type)}</span>
```

Change to:

```tsx
                            <span className="font-medium">
                              {addon.price != null ? formatAddonPrice(addon.price, type) : "Awaiting price"}
                            </span>
```

- [ ] **Step 3: Fix `openEditAddOn` and `saveEditAddOn` for null prices**

Current:

```typescript
  const openEditAddOn = (addon: AddOnRow) => {
    setEditAddOn(addon);
    setEditAddOnStatus(addon.status);
    setEditAddOnPrice(String(addon.price));
    setEditAddOnNotes(addon.notes || "");
    setEditAddOnEndDate(addon.end_date || "");
  };
```

Change to:

```typescript
  const openEditAddOn = (addon: AddOnRow) => {
    setEditAddOn(addon);
    setEditAddOnStatus(addon.status);
    setEditAddOnPrice(addon.price != null ? String(addon.price) : "");
    setEditAddOnNotes(addon.notes || "");
    setEditAddOnEndDate(addon.end_date || "");
  };
```

Current:

```typescript
  const saveEditAddOn = async () => {
    if (!editAddOn) return;
    setEditAddOnSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("client_add_ons").update({
      status: editAddOnStatus,
      price: parseFloat(editAddOnPrice),
      notes: editAddOnNotes.trim() || null,
      end_date: editAddOnEndDate || null,
      updated_at: new Date().toISOString(),
    }).eq("id", editAddOn.id);
```

Change the `price` line so a blank input keeps the price `null` rather than writing `NaN`:

```typescript
  const saveEditAddOn = async () => {
    if (!editAddOn) return;
    setEditAddOnSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("client_add_ons").update({
      status: editAddOnStatus,
      price: editAddOnPrice.trim() ? parseFloat(editAddOnPrice) : null,
      notes: editAddOnNotes.trim() || null,
      end_date: editAddOnEndDate || null,
      updated_at: new Date().toISOString(),
    }).eq("id", editAddOn.id);
```

- [ ] **Step 4: Add "Requested" to the edit dialog's status options**

Current:

```tsx
                <SelectContent style={lightVars} className="bg-white text-black">
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
```

(inside the "Edit Add-On" dialog's Status `Select`). Change to:

```tsx
                <SelectContent style={lightVars} className="bg-white text-black">
                  <SelectItem value="requested">Requested</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
```

- [ ] **Step 5: Add a requested-count badge to the admin Clients nav item**

In `src/pages/admin/AdminLayout.tsx`, add state and a fetch inside `AdminSidebar`. Add `useEffect` and `useState` to the React import:

```typescript
import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
```

Add the Supabase client import:

```typescript
import { supabase } from "@/integrations/supabase/client";
```

Inside `AdminSidebar`, after the existing `const navigate = useNavigate();` line, add:

```typescript
  const [requestedAddOnCount, setRequestedAddOnCount] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("client_add_ons")
      .select("id", { count: "exact", head: true })
      .eq("status", "requested")
      .then(({ count }: { count: number | null }) => setRequestedAddOnCount(count ?? 0));
  }, []);
```

Change the nav rendering from:

```tsx
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/admin"}
                      className="hover:bg-muted/50"
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
```

to:

```tsx
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/admin"}
                      className="hover:bg-muted/50"
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                      {!collapsed && item.title === "Clients" && requestedAddOnCount > 0 && (
                        <span className="ml-auto rounded-full bg-primary text-primary-foreground text-[10px] leading-none px-1.5 py-1">
                          {requestedAddOnCount}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
```

- [ ] **Step 6: Manually verify in the browser**

Reload `/admin` after the Task 7 request submitted earlier. Confirm the "Clients" nav item shows a small count badge matching the number of `requested` rows. Open that client's Add-Ons tab, confirm the row shows a blue "Requested" badge and "Awaiting price" instead of a broken price string. Click edit, confirm the Price field is blank (not the literal text "null"), set a price, change status to "Active", save — confirm the row updates to a green "Active" badge with the correct price, and the nav badge count decreases by one on reload.

- [ ] **Step 7: Commit**

```bash
git add src/pages/admin/ClientDetail.tsx src/pages/admin/AdminLayout.tsx
git commit -m "$(cat <<'EOF'
Handle requested add-on status across admin client detail and nav

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
