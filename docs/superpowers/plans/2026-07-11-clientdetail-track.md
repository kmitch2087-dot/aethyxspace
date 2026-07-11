# ClientDetail Track Implementation Plan (Sections 5, 7, 8)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** (5) Let Google Ads plans use project-type-aware document slots instead of the current Website-Build-only hardcoding. (7) Let an admin view any client's portal exactly as that client sees it, read-only, without a credential/session swap. (8) Show each client's real last-login timestamp to admins only.

**Architecture:** All three sections touch `src/pages/admin/ClientDetail.tsx` (already large, touched by prior sections this session) and are executed sequentially within one branch, in file order, rather than as parallel branches — this is the deliberate reason these three sections were grouped into one track. Section 5 generalizes `ClientDetail.tsx`'s hardcoded 5-slot Website-Build logic into per-project-type lookups, using namespaced slot keys so no `client_document_slots` schema change is needed. Section 7 introduces a new shared hook (`usePortalClientProfile`) that all 9 portal pages + `PortalLayout` switch to, so an admin-only `?viewAs=` query param can substitute the viewed client's profile without touching each page's own data-fetching logic, plus a scoped RLS fix on the 5 tables this feature's safety claim depends on. Section 8 adds one admin-only `SECURITY DEFINER` function exposing `auth.users.last_sign_in_at`, following the exact pattern already established by `resolve_and_record_referral()`.

**Tech Stack:** Vite + React + TypeScript, Supabase (Postgres + RLS + Edge Functions), shadcn/ui, Tailwind, React Router.

## Global Constraints

- Path alias `@/` resolves to `src/`.
- Tables not yet in generated types use `(supabase as any).from("table_name")` until types regenerate.
- No `client_document_slots` schema migration for Section 5 — namespaced slot keys avoid the need.
- RLS changes in this plan are scoped ONLY to the 5 tables View-as-Client depends on (`client_project_plans`, `client_project_tasks`, `client_agreement_records`, `client_document_slots`, `client_assets`) — do not touch the separately-tracked referral/add-on RLS gap.
- Every write action across the 9 portal pages must be checked against `isViewingAsAdmin` and disabled/hidden when true — View-as-Client's "read-only" claim is enforced at the UI layer, audited explicitly per page, not assumed.
- Do not change `PortalPay.tsx`/`PortalPayments.tsx` — they resolve identity server-side already, out of scope.
- Commit after every task, signed with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

---

### Task 1: `projectTemplates.ts` — per-project-type slot definitions

**Files:**
- Modify: `src/lib/projectTemplates.ts` (81 lines, full file read)

**Interfaces:**
- Produces: `SlotTemplate` type, `ProjectTypeTemplate.defaultSlots` — consumed by Task 2.

- [ ] **Step 1: Add the `SlotTemplate` type and extend `ProjectTypeTemplate`**

Current (lines 7-26):
```ts
export interface PhaseTemplate { name: string; description?: string; }

export interface ProjectTypeTemplate {
  key: ProjectTypeKey;
  label: string;
  defaultProjectName: string;
  usesDocumentSlots: boolean;
  defaultPhases: PhaseTemplate[];
}
```
Change to:
```ts
export interface PhaseTemplate { name: string; description?: string; }

export interface SlotTemplate {
  key: string;
  label: string;
  phaseName: string;
  isAgreement?: boolean;
}

export interface ProjectTypeTemplate {
  key: ProjectTypeKey;
  label: string;
  defaultProjectName: string;
  usesDocumentSlots: boolean;
  defaultPhases: PhaseTemplate[];
  defaultSlots: SlotTemplate[];
}
```

- [ ] **Step 2: Populate `defaultSlots` for `website_build`**

In the `website_build` entry (lines 29-41), add `defaultSlots` (lifted as-is from `ClientDetail.tsx`'s current `SLOT_TYPES`/`SLOT_LABELS`/`SLOT_PHASE_NAMES` constants — same keys, same labels, no behavior change for existing clients):
```ts
    defaultSlots: [
      { key: 'site_audit', label: 'Site Audit', phaseName: 'Site Audit' },
      { key: 'market_research', label: 'Market Research', phaseName: 'Market Research' },
      { key: 'service_tier', label: 'Service Tier Information', phaseName: 'Service Tier' },
      { key: 'plan', label: 'Project Plan', phaseName: 'Project Planning' },
      { key: 'agreement', label: 'Proposal & Agreement', phaseName: 'Contract & Agreement', isAgreement: true },
    ],
```

- [ ] **Step 3: Populate `defaultSlots` for `google_ads`**

In the `google_ads` entry (lines 42-74), add `defaultSlots` with namespaced keys (avoids colliding with `website_build`'s keys under `client_document_slots`' existing `UNIQUE(client_profile_id, slot_type)` constraint) and change `usesDocumentSlots` from `false` to `true`:
```ts
    usesDocumentSlots: true,
    defaultSlots: [
      { key: 'ga_digital_audit', label: 'Google Search / Digital Presence Audit', phaseName: 'Digital Presence Audit' },
      { key: 'ga_market_research', label: 'Market Research', phaseName: 'Market Research' },
      { key: 'ga_keyword_research', label: 'SEO Keyword Research', phaseName: 'Keyword Research' },
      { key: 'ga_service_tier', label: 'Service Tier', phaseName: 'Service Tier' },
      { key: 'ga_plan', label: 'Project Plan', phaseName: 'Project Plan' },
    ],
```
No `isAgreement` slot for Google Ads (matches the 5-item list in the design spec — no agreement-equivalent).

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit -p .
```
Expected: fails at this point since `ClientDetail.tsx` doesn't yet reference `defaultSlots` — that's expected, Task 2 consumes it. Confirm the failure is ONLY inside `ClientDetail.tsx` (not inside `projectTemplates.ts` itself) by running:
```bash
npx tsc --noEmit -p . 2>&1 | grep -v ClientDetail.tsx
```
Expected: no output (all errors are in `ClientDetail.tsx`, which Task 2 fixes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/projectTemplates.ts
git commit -m "$(cat <<'EOF'
Add per-project-type document slot definitions

website_build keeps its existing 5 slots unchanged. google_ads gets 5
new, namespaced slots (ga_* prefix) so both project types can coexist
on the same client without colliding under client_document_slots'
existing UNIQUE(client_profile_id, slot_type) constraint — no schema
migration needed.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `ClientDetail.tsx` — generalize slot logic to per-project-type

**Files:**
- Modify: `src/pages/admin/ClientDetail.tsx` (lines 22, 197-214, 351, 539-569, 1192-1333, 1520-1637, 3031-3040)

**Interfaces:**
- Consumes: `SlotTemplate`, `ProjectTypeTemplate.defaultSlots` (Task 1).
- Produces: nothing consumed by later tasks in this plan (Section 5 is complete after this task; Tasks 3-6 are independent Section 7/8 work in the same file).

- [ ] **Step 1: Import `SlotTemplate`**

Line 22, current:
```tsx
import { PROJECT_TYPES, DEFAULT_PROJECT_TYPE, getProjectTypeTemplate, type ProjectTypeKey } from "@/lib/projectTemplates";
```
Change to:
```tsx
import { PROJECT_TYPES, DEFAULT_PROJECT_TYPE, getProjectTypeTemplate, type ProjectTypeKey, type SlotTemplate } from "@/lib/projectTemplates";
```

- [ ] **Step 2: Replace the global slot constants with plan-derived helpers**

Lines 197-214, current:
```tsx
const SLOT_TYPES = ['site_audit', 'market_research', 'service_tier', 'plan', 'agreement'];
const NON_AGREEMENT_SLOTS = ['site_audit', 'market_research', 'service_tier', 'plan'];

const SLOT_LABELS: Record<string, string> = {
  site_audit: 'Site Audit',
  market_research: 'Market Research',
  service_tier: 'Service Tier Information',
  plan: 'Project Plan',
  agreement: 'Proposal & Agreement',
};

const SLOT_PHASE_NAMES: Record<string, string> = {
  site_audit: 'Site Audit',
  market_research: 'Market Research',
  service_tier: 'Service Tier',
  plan: 'Project Planning',
  agreement: 'Contract & Agreement',
};
```
Replace with (note: `ProjectPlan` is defined later in this same file at lines 149-162 — fine, TypeScript type references are not order-dependent):
```tsx
function getSlotsForPlan(plan: ProjectPlan | null): SlotTemplate[] {
  if (!plan) return [];
  return getProjectTypeTemplate(plan.project_type).defaultSlots ?? [];
}
function getSlotLabel(plan: ProjectPlan | null, slotType: string): string {
  return getSlotsForPlan(plan).find((s) => s.key === slotType)?.label ?? slotType;
}
function getSlotPhaseName(plan: ProjectPlan | null, slotType: string): string {
  return getSlotsForPlan(plan).find((s) => s.key === slotType)?.phaseName ?? slotType;
}
function getAgreementSlotKey(plan: ProjectPlan | null): string | null {
  return getSlotsForPlan(plan).find((s) => s.isAgreement)?.key ?? null;
}
function getNonAgreementSlotKeys(plan: ProjectPlan | null): string[] {
  return getSlotsForPlan(plan).filter((s) => !s.isAgreement).map((s) => s.key);
}
```

- [ ] **Step 3: Split the slot-seeding effect (lines 539-569) into two effects**

Current:
```tsx
  useEffect(() => {
    if (!id) return;
    const initSlots = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('client_document_slots').upsert(
        SLOT_TYPES.map((t) => ({ client_profile_id: id, slot_type: t })),
        { onConflict: 'client_profile_id,slot_type', ignoreDuplicates: true },
      );
      // Auto-create a Website Build plan if the client doesn't have one yet — every
      // client should have at least this one by default. Other project types (Google
      // Ads, etc.) are added explicitly via "+ New Project" and never auto-created.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingWebsitePlan } = await (supabase as any)
        .from('client_project_plans').select('id').eq('client_profile_id', id)
        .eq('project_type', 'website_build').maybeSingle();
      if (!existingWebsitePlan) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('client_project_plans').insert({
          client_profile_id: id, project_name: 'Website Project', status: 'planning',
          completion_percent: 0, project_type: 'website_build',
        });
        fetchPlan();
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: slotsData } = await (supabase as any)
        .from('client_document_slots').select('*').eq('client_profile_id', id);
      setDocSlots((slotsData as DocumentSlot[]) || []);
    };
    initSlots();
    /* eslint-disable-next-line */
  }, [id]);
```
Replace with:
```tsx
  // Auto-create a Website Build plan if the client doesn't have one yet — every
  // client should have at least this one by default. Other project types (Google
  // Ads, etc.) are added explicitly via "+ New Project" and never auto-created.
  useEffect(() => {
    if (!id) return;
    const ensureWebsitePlan = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingWebsitePlan } = await (supabase as any)
        .from('client_project_plans').select('id').eq('client_profile_id', id)
        .eq('project_type', 'website_build').maybeSingle();
      if (!existingWebsitePlan) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('client_project_plans').insert({
          client_profile_id: id, project_name: 'Website Project', status: 'planning',
          completion_percent: 0, project_type: 'website_build',
        });
        fetchPlan();
      }
    };
    ensureWebsitePlan();
  }, [id]);

  // Seed document slots for every project type the client currently has a plan for
  // — each plan's own defaultSlots (from projectTemplates.ts), not a fixed global
  // list. Re-runs (idempotently, via upsert+ignoreDuplicates) whenever allPlans
  // changes/loads, so this correctly waits for fetchPlan() to populate allPlans
  // rather than racing it.
  useEffect(() => {
    if (!id || allPlans.length === 0) return;
    const seedSlots = async () => {
      const allSlotTemplates = allPlans.flatMap((p) => getSlotsForPlan(p));
      if (allSlotTemplates.length === 0) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('client_document_slots').upsert(
        allSlotTemplates.map((s) => ({ client_profile_id: id, slot_type: s.key })),
        { onConflict: 'client_profile_id,slot_type', ignoreDuplicates: true },
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: slotsData } = await (supabase as any)
        .from('client_document_slots').select('*').eq('client_profile_id', id);
      setDocSlots((slotsData as DocumentSlot[]) || []);
    };
    seedSlots();
  }, [id, allPlans]);
```

- [ ] **Step 4: Generalize `updateProjectPhaseForSlot` (lines 1192-1230)**

Current:
```tsx
  const updateProjectPhaseForSlot = async (slotType: string) => {
    if (!id) return;
    // Document slots (Site Audit / Market Research / etc.) only ever map onto the
    // client's Website Build plan — a client may also have a Google Ads (or other)
    // plan, and slot uploads must never bleed into those.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: planData } = await (supabase as any).from('client_project_plans')
      .select('id').eq('client_profile_id', id).eq('project_type', 'website_build').maybeSingle();
    if (!planData) return;
    const phaseName = SLOT_PHASE_NAMES[slotType];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase as any).from('client_project_phases')
      .select('id').eq('plan_id', planData.id).ilike('name', phaseName).maybeSingle();
    if (existing) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('client_project_phases')
        .update({ completion_percent: 100, status: 'complete', updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: phaseCount } = await (supabase as any).from('client_project_phases')
        .select('id').eq('plan_id', planData.id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('client_project_phases').insert({
        plan_id: planData.id, name: phaseName, completion_percent: 100,
        status: 'complete', sort_order: (phaseCount?.length || 0),
      });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: allPhases } = await (supabase as any).from('client_project_phases')
      .select('completion_percent').eq('plan_id', planData.id);
    if (allPhases?.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const avg = Math.round(allPhases.reduce((s: number, p: any) => s + p.completion_percent, 0) / allPhases.length);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('client_project_plans')
        .update({ completion_percent: avg, updated_at: new Date().toISOString() }).eq('id', planData.id);
    }
  };
```
Replace with:
```tsx
  const updateProjectPhaseForSlot = async (slotType: string) => {
    if (!id) return;
    // Slot keys are namespaced per project type (e.g. ga_* for Google Ads), so find
    // which of the client's plans this slot actually belongs to instead of assuming
    // Website Build.
    const owningPlan = allPlans.find((p) => getSlotsForPlan(p).some((s) => s.key === slotType));
    if (!owningPlan) return;
    const phaseName = getSlotPhaseName(owningPlan, slotType);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase as any).from('client_project_phases')
      .select('id').eq('plan_id', owningPlan.id).ilike('name', phaseName).maybeSingle();
    if (existing) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('client_project_phases')
        .update({ completion_percent: 100, status: 'complete', updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: phaseCount } = await (supabase as any).from('client_project_phases')
        .select('id').eq('plan_id', owningPlan.id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('client_project_phases').insert({
        plan_id: owningPlan.id, name: phaseName, completion_percent: 100,
        status: 'complete', sort_order: (phaseCount?.length || 0),
      });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: allPhases } = await (supabase as any).from('client_project_phases')
      .select('completion_percent').eq('plan_id', owningPlan.id);
    if (allPhases?.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const avg = Math.round(allPhases.reduce((s: number, p: any) => s + p.completion_percent, 0) / allPhases.length);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('client_project_plans')
        .update({ completion_percent: avg, updated_at: new Date().toISOString() }).eq('id', owningPlan.id);
    }
  };
```

- [ ] **Step 5: Generalize `checkAndTriggerAgreement` (lines 1232-1249) to take the owning plan**

Current:
```tsx
  const checkAndTriggerAgreement = async (currentSlots: DocumentSlot[]) => {
    const agreementSlot = currentSlots.find((s) => s.slot_type === 'agreement');
    if (!agreementSlot || !['pending', 'in_progress'].includes(agreementSlot.status)) return;
    const allOthersDone = NON_AGREEMENT_SLOTS.every((t) => {
      const s = currentSlots.find((sl) => sl.slot_type === t);
      return s?.status === 'uploaded' || s?.status === 'na';
    });
    if (allOthersDone && id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('client_document_slots').upsert(
        { client_profile_id: id, slot_type: 'agreement', status: 'in_preparation' },
        { onConflict: 'client_profile_id,slot_type' },
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).from('client_document_slots').select('*').eq('client_profile_id', id);
      setDocSlots((data as DocumentSlot[]) || []);
    }
  };
```
Replace with:
```tsx
  const checkAndTriggerAgreement = async (currentSlots: DocumentSlot[], owningPlan: ProjectPlan) => {
    const agreementKey = getAgreementSlotKey(owningPlan);
    if (!agreementKey) return; // this project type has no agreement slot (e.g. Google Ads)
    const agreementSlot = currentSlots.find((s) => s.slot_type === agreementKey);
    if (!agreementSlot || !['pending', 'in_progress'].includes(agreementSlot.status)) return;
    const nonAgreementKeys = getNonAgreementSlotKeys(owningPlan);
    const allOthersDone = nonAgreementKeys.every((t) => {
      const s = currentSlots.find((sl) => sl.slot_type === t);
      return s?.status === 'uploaded' || s?.status === 'na';
    });
    if (allOthersDone && id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('client_document_slots').upsert(
        { client_profile_id: id, slot_type: agreementKey, status: 'in_preparation' },
        { onConflict: 'client_profile_id,slot_type' },
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).from('client_document_slots').select('*').eq('client_profile_id', id);
      setDocSlots((data as DocumentSlot[]) || []);
    }
  };
```

- [ ] **Step 6: Update `handleSlotUpload` (lines 1251-1278) for the new signatures**

Current:
```tsx
  const handleSlotUpload = async (slotType: string, file: File) => {
    if (!id) return;
    setUploadingSlot(slotType);
    try {
      const path = `${id}/${slotType}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('client-slot-docs').upload(path, file);
      if (uploadError) throw uploadError;
      // Agreement upload → awaiting signature; all others → uploaded
      const newStatus = slotType === 'agreement' ? 'awaiting_signature' : 'uploaded';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('client_document_slots').upsert({
        client_profile_id: id, slot_type: slotType, status: newStatus,
        storage_path: path, file_name: file.name, file_size: file.size,
        uploaded_at: new Date().toISOString(),
      }, { onConflict: 'client_profile_id,slot_type' });
      if (slotType !== 'agreement') await updateProjectPhaseForSlot(slotType);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).from('client_document_slots').select('*').eq('client_profile_id', id);
      const refreshed = (data as DocumentSlot[]) || [];
      setDocSlots(refreshed);
      if (slotType !== 'agreement') await checkAndTriggerAgreement(refreshed);
      toast({ title: slotType === 'agreement' ? 'Proposal uploaded — awaiting client signature' : `${SLOT_LABELS[slotType]} uploaded` });
    } catch {
      toast({ title: 'Upload failed', variant: 'destructive' });
    } finally {
      setUploadingSlot(null);
    }
  };
```
Replace with:
```tsx
  const handleSlotUpload = async (slotType: string, file: File) => {
    if (!id) return;
    const owningPlan = allPlans.find((p) => getSlotsForPlan(p).some((s) => s.key === slotType));
    setUploadingSlot(slotType);
    try {
      const path = `${id}/${slotType}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('client-slot-docs').upload(path, file);
      if (uploadError) throw uploadError;
      const isAgreementSlot = owningPlan ? getAgreementSlotKey(owningPlan) === slotType : false;
      // Agreement upload → awaiting signature; all others → uploaded
      const newStatus = isAgreementSlot ? 'awaiting_signature' : 'uploaded';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('client_document_slots').upsert({
        client_profile_id: id, slot_type: slotType, status: newStatus,
        storage_path: path, file_name: file.name, file_size: file.size,
        uploaded_at: new Date().toISOString(),
      }, { onConflict: 'client_profile_id,slot_type' });
      if (!isAgreementSlot) await updateProjectPhaseForSlot(slotType);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).from('client_document_slots').select('*').eq('client_profile_id', id);
      const refreshed = (data as DocumentSlot[]) || [];
      setDocSlots(refreshed);
      if (!isAgreementSlot && owningPlan) await checkAndTriggerAgreement(refreshed, owningPlan);
      toast({ title: isAgreementSlot ? 'Proposal uploaded — awaiting client signature' : `${getSlotLabel(owningPlan, slotType)} uploaded` });
    } catch {
      toast({ title: 'Upload failed', variant: 'destructive' });
    } finally {
      setUploadingSlot(null);
    }
  };
```

- [ ] **Step 7: Update `updateSlotStatus` (lines 1307-1317) for the new signature**

Current:
```tsx
  const updateSlotStatus = async (slotType: string, status: DocumentSlot['status']) => {
    if (!id) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('client_document_slots').upsert(
      { client_profile_id: id, slot_type: slotType, status },
      { onConflict: 'client_profile_id,slot_type' },
    );
    const updated = docSlots.map((s) => s.slot_type === slotType ? { ...s, status } : s);
    setDocSlots(updated);
    if (slotType !== 'agreement') await checkAndTriggerAgreement(updated);
  };
```
Replace with:
```tsx
  const updateSlotStatus = async (slotType: string, status: DocumentSlot['status']) => {
    if (!id) return;
    const owningPlan = allPlans.find((p) => getSlotsForPlan(p).some((s) => s.key === slotType));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('client_document_slots').upsert(
      { client_profile_id: id, slot_type: slotType, status },
      { onConflict: 'client_profile_id,slot_type' },
    );
    const updated = docSlots.map((s) => s.slot_type === slotType ? { ...s, status } : s);
    setDocSlots(updated);
    const isAgreementSlot = owningPlan ? getAgreementSlotKey(owningPlan) === slotType : false;
    if (!isAgreementSlot && owningPlan) await checkAndTriggerAgreement(updated, owningPlan);
  };
```

`toggleSlotView` (lines 1319-1333) is unchanged — it never referenced `SLOT_LABELS`/`SLOT_TYPES` directly.

- [ ] **Step 8: Update the Documents tab render (lines 1520-1527, 1626)**

The Documents tab now shows slots for the **currently selected plan** (the existing `plan` variable, line 350 — `allPlans.find((p) => p.id === selectedPlanId) || allPlans[0] || null`), consistent with how the Plan tab already scopes by `selectedPlanId`. Switching the plan selector elsewhere on the page changes which slot set this tab shows.

Current (lines 1520, 1524, 1527):
```tsx
              {SLOT_TYPES.map((slotType) => {
                const slot = docSlots.find((s) => s.slot_type === slotType);
                const status = slot?.status || 'pending';
                const isUploading = uploadingSlot === slotType;
                const isAgreement = slotType === 'agreement';
                return (
                  <div key={slotType} className="flex items-center gap-3 px-4 py-3 flex-wrap">
                    <span className="text-sm font-medium w-48 shrink-0">{SLOT_LABELS[slotType]}</span>
```
Replace with:
```tsx
              {getSlotsForPlan(plan).map(({ key: slotType }) => {
                const slot = docSlots.find((s) => s.slot_type === slotType);
                const status = slot?.status || 'pending';
                const isUploading = uploadingSlot === slotType;
                const isAgreement = getAgreementSlotKey(plan) === slotType;
                return (
                  <div key={slotType} className="flex items-center gap-3 px-4 py-3 flex-wrap">
                    <span className="text-sm font-medium w-48 shrink-0">{getSlotLabel(plan, slotType)}</span>
```

Current (line 1626):
```tsx
                    <span className="text-sm font-medium">{SLOT_LABELS[expandedSlot]}</span>
```
Replace with:
```tsx
                    <span className="text-sm font-medium">{getSlotLabel(plan, expandedSlot)}</span>
```

- [ ] **Step 9: Update the "Assign to Slot" dropdown (lines 3036-3037)**

Current:
```tsx
              <SelectContent style={lightVars} className="bg-white text-black">
                {SLOT_TYPES.map((slotType) => (
                  <SelectItem key={slotType} value={slotType}>{SLOT_LABELS[slotType]}</SelectItem>
                ))}
              </SelectContent>
```
Replace with:
```tsx
              <SelectContent style={lightVars} className="bg-white text-black">
                {getSlotsForPlan(plan).map(({ key: slotType }) => (
                  <SelectItem key={slotType} value={slotType}>{getSlotLabel(plan, slotType)}</SelectItem>
                ))}
              </SelectContent>
```
(This dropdown assigns into a slot on the currently-selected plan, consistent with Step 8.)

- [ ] **Step 10: Update the `DocumentSlot` interface's `slot_type` field**

The `DocumentSlot` interface (lines 94-103) currently types `slot_type` as a closed union (`'site_audit' | 'market_research' | 'service_tier' | 'plan' | 'agreement'`), which no longer covers the new `ga_*` keys. Change line 97 from:
```tsx
  slot_type: 'site_audit' | 'market_research' | 'service_tier' | 'plan' | 'agreement';
```
to:
```tsx
  slot_type: string;
```

- [ ] **Step 11: Verify**

```bash
npx tsc --noEmit -p .
npx eslint src/pages/admin/ClientDetail.tsx
npm run dev
```
Manually test against a client with a Google Ads plan: confirm the Documents tab shows the 5 `ga_*`-labeled slots when that plan is selected, upload a test file into one, confirm the corresponding phase on the Google Ads plan updates to complete (not the Website Build plan). Confirm a client with a Website Build plan still shows the original 5 slots/labels unchanged, and that an existing agreement-slot upload still flips to "awaiting signature" correctly.

- [ ] **Step 12: Commit**

```bash
git add src/pages/admin/ClientDetail.tsx
git commit -m "$(cat <<'EOF'
Generalize ClientDetail document slots to be project-type-aware

Replaces the global SLOT_TYPES/SLOT_LABELS/SLOT_PHASE_NAMES constants
(hardcoded to Website Build) with helpers derived from each plan's own
project type. The Documents tab now shows slots for the currently
selected plan; slot-driven phase completion correctly resolves which
plan owns a given slot key instead of assuming Website Build. No
client_document_slots schema change — Google Ads slot keys are
namespaced (ga_*) to avoid colliding with the existing unique
constraint.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: RLS fix — admin policies on 5 tables View-as-Client depends on

**Files:**
- Create: `supabase/migrations/20260711_view_as_client_rls_fix.sql`

**Interfaces:**
- Produces: corrected admin policies — Task 5's "read-only" safety claim depends on these actually being admin-scoped.

- [ ] **Step 1: Confirm the exact current policy definitions before changing them**

Run via Supabase MCP `execute_sql`:
```sql
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('client_project_plans', 'client_project_tasks', 'client_agreement_records', 'client_document_slots', 'client_assets')
AND policyname LIKE '%admin%';
```
Expected: 5 rows, each `USING(true)`/`WITH CHECK(true)` with no `has_role()` call — matching `cpp_admin`, `cpt_admin`, `car_admin`, `cds_admin`, `ca_admin` from the design spec's research. Record the exact policy names returned (use them verbatim below — do not assume they match if this query returns different names).

- [ ] **Step 2: Write the migration**

```sql
-- View-as-Client (admin read-only impersonation) requires these admin policies to
-- actually be admin-scoped — they were previously USING(true) with no role check,
-- meaning any authenticated user (not just admins) could read/write any client's
-- rows here. Scoped tightly to the 5 tables this feature depends on; the broader
-- referral/add-on RLS gap is tracked separately.
DROP POLICY IF EXISTS "cpp_admin" ON client_project_plans;
CREATE POLICY "cpp_admin" ON client_project_plans FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "cpt_admin" ON client_project_tasks;
CREATE POLICY "cpt_admin" ON client_project_tasks FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "car_admin" ON client_agreement_records;
CREATE POLICY "car_admin" ON client_agreement_records FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "cds_admin" ON client_document_slots;
CREATE POLICY "cds_admin" ON client_document_slots FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "ca_admin" ON client_assets;
CREATE POLICY "ca_admin" ON client_assets FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
```

If Step 1's query returned different policy names than assumed above, replace them with the real names before applying — `DROP POLICY IF EXISTS` is safe either way (won't error if the name doesn't match), but leaving the OLD, unrestricted policy in place alongside a new one would defeat the fix, so verify with Step 3 that exactly one policy remains per table afterward.

- [ ] **Step 3: Apply and verify**

Apply via Supabase MCP `apply_migration` with `name: "view_as_client_rls_fix"`. Then verify:
```sql
SELECT tablename, policyname, cmd, roles, qual
FROM pg_policies
WHERE tablename IN ('client_project_plans', 'client_project_tasks', 'client_agreement_records', 'client_document_slots', 'client_assets');
```
Expected: exactly one policy per table (the client-facing own-row SELECT policies these tables might also have are separate and untouched — confirm the count of policies matches what existed before plus/minus only the admin one changing), each admin policy's `qual`/`with_check` now containing `has_role`.

Also run `get_advisors` (Supabase MCP) afterward and confirm no new advisory warnings were introduced by this change (existing advisories about the still-deferred referral/add-on tables are expected and not this task's concern).

- [ ] **Step 4: Regression-check existing admin flows still work**

Since `ClientDetail.tsx` and other admin pages already read/write these 5 tables as an authenticated admin, and admins already pass `has_role(auth.uid(), 'admin'::app_role)`, this should be a no-op for existing admin functionality. Manually verify in `npm run dev`: as an admin, open a client's Plan tab (reads `client_project_plans`/`client_project_phases`... note `client_project_phases` is NOT in this migration's scope, confirm it still works via its own existing policy), Tasks, Agreements, Documents (slots), and Assets tabs all still load and save correctly.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260711_view_as_client_rls_fix.sql
git commit -m "$(cat <<'EOF'
Scope admin RLS policies on 5 client-data tables to has_role()

client_project_plans, client_project_tasks, client_agreement_records,
client_document_slots, and client_assets previously had USING(true)
admin policies with no role check, so any authenticated user (not
just admins) could read/write any client's rows. Fixed to require
has_role(auth.uid(), 'admin'::app_role), matching the pattern already
used correctly on client_profiles/client_documents. Scoped to exactly
these 5 tables since View-as-Client's read-only safety claim depends
on it; the broader referral/add-on RLS gap remains a separate,
already-tracked fast-follow.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: `usePortalClientProfile` hook + refactor all 9 portal pages

**Files:**
- Create: `src/hooks/usePortalClientProfile.tsx`
- Modify: `src/pages/portal/PortalLayout.tsx:129-153`
- Modify: `src/pages/portal/PortalOverview.tsx:13-21`
- Modify: `src/pages/portal/PortalDocuments.tsx:43-50`
- Modify: `src/pages/portal/PortalProjects.tsx:81-88`
- Modify: `src/pages/portal/PortalTasks.tsx:31-38`
- Modify: `src/pages/portal/PortalIntake.tsx:36-42`
- Modify: `src/pages/portal/PortalAddOns.tsx:36-44`
- Modify: `src/pages/portal/PortalAgreements.tsx:15-23`
- Modify: `src/pages/portal/PortalMessages.tsx:19-27`

**Interfaces:**
- Consumes: `useAuth()` (`user`, `isAdmin`), `client_profiles` (admin's existing `has_role`-gated SELECT policy — no RLS change needed for this table).
- Produces: `usePortalClientProfile(): { profile: {id, full_name, email, ...} | null, loading: boolean, isViewingAsAdmin: boolean }` — consumed by all 9 pages and `PortalLayout` (this task), and by Task 5 (banner/write-lockout).

- [ ] **Step 1: Write the hook**

```tsx
// src/hooks/usePortalClientProfile.tsx
// Resolves "which client's data should this portal page show." Normally that's the
// logged-in client's own profile. If an admin opens a portal page with ?viewAs=<id>,
// this resolves to the target client's profile instead — the one seam every portal
// page and PortalLayout consume, so View-as-Client doesn't require a parallel data
// path or a credential/session swap.
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export interface PortalClientProfile {
  id: string;
  full_name: string;
  email: string | null;
  [key: string]: unknown;
}

interface UsePortalClientProfileResult {
  profile: PortalClientProfile | null;
  loading: boolean;
  isViewingAsAdmin: boolean;
}

export function usePortalClientProfile(): UsePortalClientProfileResult {
  const { user, isAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const viewAs = searchParams.get("viewAs");
  const [profile, setProfile] = useState<PortalClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const isViewingAsAdmin = Boolean(viewAs && isAdmin);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    (async () => {
      if (isViewingAsAdmin && viewAs) {
        const { data } = await supabase.from("client_profiles").select("*").eq("id", viewAs).maybeSingle();
        setProfile(data as PortalClientProfile | null);
      } else {
        const { data } = await supabase.from("client_profiles").select("*").eq("user_id", user.id).maybeSingle();
        setProfile(data as PortalClientProfile | null);
      }
      setLoading(false);
    })();
  }, [user, viewAs, isViewingAsAdmin]);

  return { profile, loading, isViewingAsAdmin };
}
```

- [ ] **Step 2: Refactor `PortalLayout.tsx`**

Current (lines 129-153):
```tsx
const PortalLayout = () => {
  const { user } = useAuth();
  const [needsIntake, setNeedsIntake] = useState(false);
  const [referralEnabled, setReferralEnabled] = useState(false);
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({});

  // Notify admin once when an invited client first signs in.
  useEffect(() => {
    if (!user) return;
    const key = `portal-activation-notified:${user.id}`;
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, "1");
      supabase.functions.invoke("notify-portal-activation")
        .then(() => supabase.functions.invoke("dispatch-doc-event", { body: { event_name: "portal_activated" } }))
        .catch(() => sessionStorage.removeItem(key));
    }
    // Check intake status and referral access
    supabase.from("client_profiles")
      .select("intake_required, intake_completed_at, referral_enabled")
      .eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data && !data.intake_completed_at) setNeedsIntake(true);
        if (data?.referral_enabled) setReferralEnabled(true);
      });
  }, [user]);
```
Replace with (adds the hook, and skips the activation-notify/intake-nag entirely while viewing as another client — an admin browsing a client's portal should never trigger the client's own "you're new here" side effects):
```tsx
const PortalLayout = () => {
  const { user } = useAuth();
  const { profile, isViewingAsAdmin } = usePortalClientProfile();
  const [needsIntake, setNeedsIntake] = useState(false);
  const [referralEnabled, setReferralEnabled] = useState(false);
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({});

  // Notify admin once when an invited client first signs in. Skipped entirely
  // while an admin is viewing as another client — these are real-client-only
  // side effects.
  useEffect(() => {
    if (!user || isViewingAsAdmin) return;
    const key = `portal-activation-notified:${user.id}`;
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, "1");
      supabase.functions.invoke("notify-portal-activation")
        .then(() => supabase.functions.invoke("dispatch-doc-event", { body: { event_name: "portal_activated" } }))
        .catch(() => sessionStorage.removeItem(key));
    }
    // Check intake status and referral access
    supabase.from("client_profiles")
      .select("intake_required, intake_completed_at, referral_enabled")
      .eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data && !data.intake_completed_at) setNeedsIntake(true);
        if (data?.referral_enabled) setReferralEnabled(true);
      });
  }, [user, isViewingAsAdmin]);
```

Update the badge-count effect (lines 157-231) to use the hook's resolved `profile` instead of its own inline lookup, and to skip entirely while viewing as another client (an admin's own "unseen" state is meaningless here — badges reflect the real client's unseen state, which this admin session hasn't earned the right to silently mark seen). Current opening (lines 157-166):
```tsx
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data: profile } = await supabase
          .from("client_profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!profile) return;
```
Replace with:
```tsx
  useEffect(() => {
    if (!user || isViewingAsAdmin || !profile) return;
    (async () => {
      try {
```
(The rest of the effect body, lines 168-230, is unchanged — it already only used `profile.id`, which is now the outer closure's `profile` from the hook. Update the effect's dependency array from `[user]` to `[user, profile, isViewingAsAdmin]`.)

Add the view-as banner in the render (inside the returned JSX, right after the opening `<div className="min-h-screen flex w-full bg-transparent">` on line 236, before `<PortalSidebar ...>`):
```tsx
        {isViewingAsAdmin && profile && (
          <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-black text-sm px-4 py-2 flex items-center justify-between">
            <span>Viewing as {profile.full_name} — read-only</span>
            <a href={`/admin/clients/${profile.id}`} className="font-medium underline">Exit</a>
          </div>
        )}
```
(This task adds the banner's structure; Task 5 wires the "Exit" link target and confirms the top-offset doesn't overlap the existing header — visually verify in Step 4 below.)

- [ ] **Step 3: Refactor each of the 9 portal pages**

Apply the same mechanical replacement to each file: swap the inline `client_profiles` lookup for the shared hook. Each page keeps its own subsequent data-fetching logic unchanged, just sourced from the hook's `profile` instead of a locally-resolved row.

**`src/pages/portal/PortalOverview.tsx`** — current (lines 13-21):
```tsx
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: profileData } = await supabase
        .from("client_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      setProfile(profileData);
      const pid = profileData?.id;
```
Replace with (add `const { profile: resolvedProfile } = usePortalClientProfile();` near the top of the component, alongside the existing `const { user } = useAuth();`, and import the hook):
```tsx
  useEffect(() => {
    if (!user || !resolvedProfile) return;
    const load = async () => {
      const profileData = resolvedProfile;
      setProfile(profileData);
      const pid = profileData?.id;
```
Update the effect's dependency array from `[user]` to `[user, resolvedProfile]`. Add the import: `import { usePortalClientProfile } from "@/hooks/usePortalClientProfile";`.

**`src/pages/portal/PortalDocuments.tsx`** — current (lines 43-50, inside `const load = async () => {`):
```tsx
  const load = async () => {
    if (!user) return;
    const { data: p } = await supabase
      .from("client_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    setProfile(p);
```
Replace with (add `const { profile: resolvedProfile } = usePortalClientProfile();` near the top, import the hook):
```tsx
  const load = async () => {
    if (!user || !resolvedProfile) return;
    const p = resolvedProfile;
    setProfile(p);
```
Update the `useEffect(() => { load(); }, [user]);` (line 95) to `useEffect(() => { load(); }, [user, resolvedProfile]);`.

**`src/pages/portal/PortalProjects.tsx`** — current (lines 84-88, inside `async function load()`):
```tsx
      const { data: profile } = await supabase
        .from("client_profiles")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (!profile) { setLoading(false); return; }
```
Replace with (add `const { profile: resolvedProfile } = usePortalClientProfile();` near the top, import the hook):
```tsx
      const profile = resolvedProfile;

      if (!profile) { setLoading(false); return; }
```
Update `useEffect(() => { if (!user) return; load(); }, [user]);` (lines 76-79) to `useEffect(() => { if (!user || !resolvedProfile) return; load(); }, [user, resolvedProfile]);`.

**`src/pages/portal/PortalTasks.tsx`** — current (lines 34-40, inside `async function load()`):
```tsx
      const { data: profile } = await supabase
        .from("client_profiles")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (!profile) { setLoading(false); return; }
```
Replace with same pattern as `PortalProjects.tsx`. Update the `useEffect` (lines 25-29) the same way.

**`src/pages/portal/PortalIntake.tsx`** — current (lines 38-42):
```tsx
      const [{ data: f }, { data: p }] = await Promise.all([
        supabase.from("intake_form_fields").select("*").eq("active", true).order("section").order("display_order"),
        supabase.from("client_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      setFields((f || []) as any);
      setProfile(p);
```
Replace with (add `const { profile: resolvedProfile } = usePortalClientProfile();` near the top, import the hook):
```tsx
      const { data: f } = await supabase.from("intake_form_fields").select("*").eq("active", true).order("section").order("display_order");
      const p = resolvedProfile;
      setFields((f || []) as any);
      setProfile(p);
```
Update the guarding `useEffect(() => { if (!user) return; ... }, [user]);` (line 36) to also require `resolvedProfile` and depend on it — same pattern as above. **Note**: `PortalIntake.tsx` is a page a client fills out themselves; while viewing as another client, the intake form should still render read-only-ish (Task 5's write-lockout audit covers disabling its submit button when `isViewingAsAdmin` is true — this task only wires the profile resolution).

**`src/pages/portal/PortalAddOns.tsx`** — current (lines 36-45, inside `const load = async () => {`):
```tsx
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
```
Replace with (add `const { profile: resolvedProfile } = usePortalClientProfile();` near the top, import the hook):
```tsx
  const load = async () => {
    if (!user || !resolvedProfile) return;
    setLoading(true);
    const pid = resolvedProfile.id;
    setProfileId(pid);
```
Find and update this file's `useEffect` that calls `load()` to also depend on `resolvedProfile`.

**`src/pages/portal/PortalAgreements.tsx`** — current (lines 15-23, inside `const load = async () => {`):
```tsx
  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data: profileData } = await supabase
      .from("client_profiles")
      .select("id, full_name, email")
      .eq("user_id", user.id)
      .maybeSingle();
    setProfile(profileData);
```
Replace with (add `const { profile: resolvedProfile } = usePortalClientProfile();` near the top, import the hook):
```tsx
  const load = async () => {
    if (!user || !resolvedProfile) return;
    setLoading(true);
    const profileData = resolvedProfile;
    setProfile(profileData);
```
Find and update this file's `useEffect` that calls `load()` to also depend on `resolvedProfile`.

**`src/pages/portal/PortalMessages.tsx`** — current (lines 19-27, inside `const fetchMessages = async () => {`):
```tsx
  const fetchMessages = async () => {
    if (!user) return;
    const { data: profile } = await supabase
      .from("client_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    const pid = profile?.id || null;
    setProfileId(pid);
```
Replace with (add `const { profile: resolvedProfile } = usePortalClientProfile();` near the top, import the hook):
```tsx
  const fetchMessages = async () => {
    if (!user || !resolvedProfile) return;
    const pid = resolvedProfile.id;
    setProfileId(pid);
```
Update `useEffect(() => { fetchMessages(); }, [user]);` (line 41) to `useEffect(() => { fetchMessages(); }, [user, resolvedProfile]);`.

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit -p .
npm run dev
```
As a real client, confirm every one of the 9 pages still loads exactly as before (no `viewAs` param — hook resolves by `user.id`, identical to the old inline lookups). As an admin, manually navigate to `/portal/overview?viewAs=<a real client_profile_id>` and confirm the page shows that client's data and the amber banner renders (link target confirmed functional in Task 5). As a non-admin authenticated user, confirm `?viewAs=...` does **not** switch profiles (falls through to `user.id` resolution, which will simply show nothing/their own data if they have no client profile) — this is enforced by `isViewingAsAdmin` requiring `isAdmin` inside the hook.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/usePortalClientProfile.tsx src/pages/portal/PortalLayout.tsx src/pages/portal/PortalOverview.tsx src/pages/portal/PortalDocuments.tsx src/pages/portal/PortalProjects.tsx src/pages/portal/PortalTasks.tsx src/pages/portal/PortalIntake.tsx src/pages/portal/PortalAddOns.tsx src/pages/portal/PortalAgreements.tsx src/pages/portal/PortalMessages.tsx
git commit -m "$(cat <<'EOF'
Add usePortalClientProfile hook, refactor all portal pages to use it

Replaces each of the 9 portal pages' + PortalLayout's independent
inline client_profiles lookups with one shared hook. Normally resolves
by the logged-in user's own profile (identical behavior to before);
when an admin opens a page with ?viewAs=<clientProfileId>, resolves to
the target client's profile instead. This is the seam View-as-Client
(Task 5) hangs its read-only banner and write-lockout off of.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: `ClientRoute` guard, "View as" button, write-lockout audit

**Files:**
- Modify: `src/components/ClientRoute.tsx`
- Modify: `src/pages/admin/ClientDetail.tsx` (header, lines 1385-1406)
- Modify: `src/pages/portal/PortalDocuments.tsx`, `PortalAgreements.tsx`, `PortalTasks.tsx`, `PortalAddOns.tsx`, `PortalIntake.tsx`, `PortalMessages.tsx` (write-action gating)

**Interfaces:**
- Consumes: `usePortalClientProfile()` (Task 4).
- Produces: nothing consumed by later tasks (final task for Section 7).

- [ ] **Step 1: Add the `viewAs` guard to `ClientRoute.tsx`**

Current (full file):
```tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const ClientRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;

  return <>{children}</>;
};

export default ClientRoute;
```
Replace with:
```tsx
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const ClientRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isAdmin, adminChecked } = useAuth();
  const [searchParams] = useSearchParams();
  const viewAs = searchParams.get("viewAs");

  if (loading || (viewAs && user && !adminChecked)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;
  if (viewAs && !isAdmin) return <Navigate to="/admin/login" replace />;

  return <>{children}</>;
};

export default ClientRoute;
```
(Waiting on `adminChecked` before deciding avoids a flash-redirect for a real admin whose admin-role check hasn't resolved yet — same race this app already guards against in `AdminRoute.tsx`.)

- [ ] **Step 2: Add the "View as" button in `ClientDetail.tsx`**

Current header (lines 1385-1406):
```tsx
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-3">
            <Link to="/admin/clients"><ArrowLeft className="h-4 w-4 mr-1" /> Clients</Link>
          </Button>
          <h1 className="text-2xl font-display tracking-wider">{profile.full_name}</h1>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {profile.email && (
            <Button variant="outline" size="sm" onClick={handleResendInvite}>
              <Mail className="h-4 w-4 mr-2" /> Resend invite
            </Button>
          )}
          <Button size="sm" onClick={saveProfile} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save
          </Button>
        </div>
      </div>
```
Replace with (adds a "View as" button that opens the portal in a new tab so the admin doesn't lose their own panel tab):
```tsx
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-3">
            <Link to="/admin/clients"><ArrowLeft className="h-4 w-4 mr-1" /> Clients</Link>
          </Button>
          <h1 className="text-2xl font-display tracking-wider">{profile.full_name}</h1>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/portal/overview?viewAs=${profile.id}`, "_blank", "noopener,noreferrer")}
          >
            <Eye className="h-4 w-4 mr-2" /> View as {profile.first_name || profile.full_name.split(" ")[0]}
          </Button>
          {profile.email && (
            <Button variant="outline" size="sm" onClick={handleResendInvite}>
              <Mail className="h-4 w-4 mr-2" /> Resend invite
            </Button>
          )}
          <Button size="sm" onClick={saveProfile} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save
          </Button>
        </div>
      </div>
```
Add `Eye` to the existing `lucide-react` import list at the top of the file (check it's not already imported before adding — search the file's import block first).

- [ ] **Step 3: Audit and gate write actions across the 9 portal pages**

For each of the following, add `const { isViewingAsAdmin } = usePortalClientProfile();` (the hook is already imported from Task 4; just also destructure `isViewingAsAdmin` where not already done) and disable/hide the listed write actions when `isViewingAsAdmin` is true:

- **`PortalDocuments.tsx`**: message-send button in the document thread dialog (`handleSend`'s trigger button) — add `disabled={isViewingAsAdmin}` alongside its existing disabled conditions.
- **`PortalAgreements.tsx`**: the `AgreementDocument` component's save/submit actions — pass a new prop, e.g. `readOnly={isViewingAsAdmin}`, through to `AgreementDocument` (read `src/components/AgreementDocument.tsx`'s props first to add this cleanly — if it has no such prop today, add one that disables its Save/Save-and-Send buttons when true, following whatever prop-naming convention the component already uses for its other boolean flags).
- **`PortalTasks.tsx`**: the task-completion toggle/button — add `disabled={isViewingAsAdmin}` (or hide the control entirely) on whatever element calls the status-update handler.
- **`PortalAddOns.tsx`**: the "Request this" button — add `disabled={isViewingAsAdmin}`.
- **`PortalIntake.tsx`**: the form's submit button — add `disabled={isViewingAsAdmin || submitting}` (combine with the existing `submitting` guard rather than replacing it).
- **`PortalMessages.tsx`**: the send-message button — add `disabled={isViewingAsAdmin || sending || !newMessage.trim()}` (combine with existing guards).

`PortalOverview.tsx` and `PortalProjects.tsx` have no write actions to gate (read-only pages already). `PortalPay.tsx`/`PortalPayments.tsx` are explicitly out of scope (Global Constraints).

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit -p .
npm run dev
```
As admin, click "View as {name}" from a real client's `ClientDetail.tsx` page, confirm it opens `/portal/overview?viewAs=<id>` in a new tab, the amber banner renders, and every write action audited in Step 3 is disabled. Click the banner's "Exit" link, confirm it returns to that client's admin detail page. Confirm a direct, non-admin authenticated user hitting a `?viewAs=...` URL is redirected to `/admin/login` (per Step 1's guard).

- [ ] **Step 5: Commit**

```bash
git add src/components/ClientRoute.tsx src/pages/admin/ClientDetail.tsx src/pages/portal/PortalDocuments.tsx src/pages/portal/PortalAgreements.tsx src/pages/portal/PortalTasks.tsx src/pages/portal/PortalAddOns.tsx src/pages/portal/PortalIntake.tsx src/pages/portal/PortalMessages.tsx
git commit -m "$(cat <<'EOF'
Add View-as-Client entry point, route guard, and write-action lockout

ClientRoute now requires isAdmin when ?viewAs= is present (never a
credential/session swap). ClientDetail gets a "View as {name}" button
opening the portal in a new tab. Every write action across the portal
pages (messages, agreement save/submit, task completion, add-on
requests, intake submit) is disabled while isViewingAsAdmin is true —
audited page-by-page, not assumed from RLS alone.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Last-Logged-In (admin-only)

**Files:**
- Create: `supabase/migrations/20260711_client_last_sign_in.sql`
- Modify: `src/pages/admin/Clients.tsx` (lines 32-39, 70-78, 258-282)
- Modify: `src/pages/admin/ClientDetail.tsx` (header, alongside Task 5's changes)

**Interfaces:**
- Produces: `get_client_last_sign_ins()` RPC — consumed by `Clients.tsx` and `ClientDetail.tsx`.

- [ ] **Step 1: Write the migration**

```sql
-- Admin-only: expose auth.users.last_sign_in_at for the client roster/detail views.
-- Follows the same SECURITY DEFINER + internal admin check pattern already
-- established by resolve_and_record_referral() — never a bypass, gated inside
-- the function body.
CREATE OR REPLACE FUNCTION public.get_client_last_sign_ins()
RETURNS TABLE(client_profile_id uuid, last_sign_in_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN; -- empty result set for non-admins, not an error
  END IF;
  RETURN QUERY
    SELECT cp.id, u.last_sign_in_at
    FROM client_profiles cp
    JOIN auth.users u ON u.id = cp.user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_client_last_sign_ins() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_last_sign_ins() TO authenticated;
```

- [ ] **Step 2: Apply and verify**

Apply via Supabase MCP `apply_migration` with `name: "client_last_sign_in"`. Verify:
```sql
SELECT * FROM get_client_last_sign_ins() LIMIT 5;
```
Run this as the Supabase MCP's own connection (which typically runs with elevated privileges, not as a specific `auth.uid()`) — if it returns rows, that's expected for this verification context; the real admin-gating is exercised properly when called via the actual authenticated app (confirmed in Step 5's manual test). If it returns zero rows here specifically because `auth.uid()` is null in this execution context, that's also consistent with the function's own logic (`has_role(NULL, 'admin'::app_role)` evaluates false) — either outcome is fine, just note which one you observed.

- [ ] **Step 3: Wire into `Clients.tsx`**

Add a new interface near `InvoiceAgg` (after line 45):
```tsx
interface LastSignIn {
  client_profile_id: string;
  last_sign_in_at: string | null;
}
```
Add state near the other `useState` declarations (after `invAgg`):
```tsx
  const [lastSignIns, setLastSignIns] = useState<LastSignIn[]>([]);
```
Update `fetchAll` (lines 70-78) to also call the new RPC:
```tsx
  const fetchAll = async () => {
    const [c, i, ls] = await Promise.all([
      supabase.from("client_profiles").select("id, full_name, email, business_name, status, stripe_customer_ids").order("full_name"),
      supabase.from("client_invoices").select("client_profile_id, amount_due, needs_review"),
      supabase.rpc("get_client_last_sign_ins"),
    ]);
    setClients((c.data as ClientRow[]) || []);
    setInvAgg((i.data as InvoiceAgg[]) || []);
    setLastSignIns((ls.data as LastSignIn[]) || []);
    setLoading(false);
  };
```
Add a lookup map near `aggByClient` (after its `useMemo` block):
```tsx
  const lastSignInByClient = useMemo(() => {
    const m = new Map<string, string | null>();
    lastSignIns.forEach((r) => m.set(r.client_profile_id, r.last_sign_in_at));
    return m;
  }, [lastSignIns]);
```
In the roster row render (line 272), add the last-login value to the existing subline:
```tsx
                      <p className="text-xs text-muted-foreground">
                        {c.email || "—"}{c.business_name ? ` · ${c.business_name}` : ""}
                        {lastSignInByClient.get(c.id) ? ` · Last login ${new Date(lastSignInByClient.get(c.id)!).toLocaleDateString()}` : " · Never logged in"}
                      </p>
```

- [ ] **Step 4: Wire into `ClientDetail.tsx`**

Add a fetch alongside the page's existing data loads (find the main `fetchAll`/mount effect and add a call to `supabase.rpc("get_client_last_sign_ins")`, filtering the result down to this one client's row by `id`), and render it in the header near `profile.email` (line 1393), e.g.:
```tsx
          <p className="text-sm text-muted-foreground">{profile.email}</p>
          <p className="text-xs text-muted-foreground">
            {lastSignIn ? `Last login ${new Date(lastSignIn).toLocaleDateString()}` : "Never logged in"}
          </p>
```
(Introduce a `lastSignIn` state variable set from the RPC result, scoped to this admin-only header — never rendered anywhere in the portal.)

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit -p .
npm run dev
```
Confirm the Clients roster shows a last-login date (or "Never logged in") per client, and `ClientDetail.tsx`'s header shows the same for the individual client being viewed. Confirm nothing client-facing (any `Portal*.tsx` page) renders this value.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260711_client_last_sign_in.sql src/pages/admin/Clients.tsx src/pages/admin/ClientDetail.tsx
git commit -m "$(cat <<'EOF'
Add admin-only "Last Logged In" display

New get_client_last_sign_ins() SECURITY DEFINER function (admin-gated
internally, following resolve_and_record_referral's established
pattern) exposes auth.users.last_sign_in_at to the client roster and
detail header. Never rendered client-facing.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
