

## Reshape the consultation flow → Client Intake Form (with admin-editable questions)

### What changes for visitors

Today: Every "Book a Consultation" button takes the visitor to a Stripe checkout for $50, then a "we'll be in touch" page. There is no scheduling tool wired up — but the copy implies they're booking a meeting, which sets the wrong expectation.

New flow:
1. Visitor clicks **Book a Consultation** anywhere on the site.
2. Lands on a new **/intake** page with your full intake form (free to submit).
3. Submits → sees a confirmation: *"Thanks. I'll personally review your submission, do real research on your business, and reach out within 2 business days with a $50 invoice for our strategy session."*
4. You review in admin, send them a Stripe invoice manually (or one-click from the new Inquiries detail view), then schedule the call once paid.

The Stripe checkout button on the homepage hero, Contact page, and Start Here page all get replaced with **"Begin Intake"** routing to `/intake`. The Stripe consultation flow stays intact behind the scenes for when you send the invoice — just no longer triggered from a public button.

### The Client Intake Form (deep research set)

Single page, your existing dark/teal styling, grouped into 4 sections:

**1. About you**
- Full name *
- Email *
- Phone
- Business name *
- Website (current, if any)
- Industry *

**2. The project**
- Project type * (rebrand / new build / redesign / scale existing / not sure)
- Biggest challenge right now *
- Top 3 goals for this project *
- Timeline *
- Budget range *
- Brand assets status (none / partial / complete)
- Content readiness (need help / drafted / finalized)

**3. The market**
- Target audience *
- 2–3 competitors (URLs)
- Current marketing channels
- How will you measure success *

**4. Anything else**
- Inspiration links / references
- Anything else I should know

Every field is stored. Required fields marked with *.

### Admin-editable questions (so you can change it anytime)

New `intake_form_fields` table. The intake page renders fields **dynamically from this table**, so when you add or change a question in admin you don't need a rebuild.

Each field row:
- label, help text, field type (text / textarea / email / tel / url / select / multiselect), options (for select), required (yes/no), section (about / project / market / extra), display order, active (yes/no).

Seeded with the 18 questions above. New admin page at `/admin/intake-form` lets you add, edit, reorder (drag handle), toggle active, and delete questions.

### Where submissions live

New `client_intakes` table:
- Identity columns (name, email, phone, business)
- `responses` jsonb — the full answer set keyed by field id, so it survives field changes
- status: `new` / `reviewing` / `invoice_sent` / `paid` / `archived`
- `linked_user_id` (filled when they later create a portal account with the same email)
- timestamps

New admin page `/admin/intakes` (replaces the current Inquiries page's role for new leads, or sits alongside it):
- List view, filter by status
- Detail drawer shows all responses cleanly grouped
- Buttons: "Mark reviewing" / "Send $50 invoice" (creates a Stripe invoice for that email and marks `invoice_sent`) / "Archive"

### Client profile is created from the intake — not duplicated

When a lead later signs up via Client Login using the same email as their intake:
- Their `client_profiles` row is auto-prefilled from the intake responses (name, business, phone).
- The intake's `linked_user_id` is set so you can see "Intake → Profile → Documents → Agreements → Payments" all on one client record.

The Portal stays the place they see documents, agreements, messages, and payment history — exactly as it works now. Nothing about the portal UI changes.

### Admin login = Client Login button (same door)

Right now `/admin/login` is a separate page. Change: when **you** click **Client Login** in the navbar and sign in:
- `useAuth` already resolves `isAdmin`. After successful login, the dialog routes admins to `/admin` and clients to `/portal`.
- `/admin/login` keeps existing for direct bookmarks but the public path is the same Client Login button.

### Files touched

**New**
- `src/pages/Intake.tsx` — the public intake form, dynamically rendered from `intake_form_fields`
- `src/pages/IntakeSuccess.tsx` — confirmation page
- `src/pages/admin/IntakeForm.tsx` — drag-to-reorder field manager
- `src/pages/admin/Intakes.tsx` — submissions inbox + detail drawer + "Send $50 invoice" action
- `supabase/functions/send-consultation-invoice/index.ts` — creates a Stripe invoice for the lead
- Migration: `intake_form_fields`, `client_intakes` tables + RLS (public INSERT into `client_intakes` with field-length caps, admin-only SELECT/UPDATE; admin-only on `intake_form_fields` with public SELECT for active rows)
- Migration: trigger on `auth.users` insert to backfill `client_profiles` + link `client_intakes` by email

**Edited**
- `src/App.tsx` — add `/intake`, `/intake-success`, `/admin/intake-form`, `/admin/intakes` routes
- `src/pages/Home.tsx` — three "Book a Consultation" buttons → "Begin Intake" → `/intake`. Update "Why book a consultation" copy: *"Click below to share your business with me through a short intake form. I'll review it, do real research on your brand and competitors, then reach out with a $50 invoice for a focused strategy session — so when we talk, I come with real data, not generic advice."*
- `src/pages/Contact.tsx` — replace the Stripe checkout form with a short "Begin Intake" CTA + the existing direct-contact row
- `src/pages/StartHere.tsx` — remove the `<ConsultationPayment />` card; the right-hand column becomes a "Strategy Consultation" card that explains the new flow and links to `/intake`
- `src/components/ClientLoginDialog.tsx` — after login, route admins to `/admin` and clients to `/portal`
- `src/pages/admin/AdminLayout.tsx` — add "Intakes" and "Intake Form" sidebar links

**Untouched**: Portal pages, brand styling, hero, navbar layout, Stripe consultation edge function (still used by the new invoice flow).

### What stays manual / outside this build

- Scheduling the actual call still happens in your existing calendar; no booking widget is added.
- Sending the $50 invoice is a one-click action from admin, but you decide *when* to send it after reviewing.

