

## Plan: Traffic Tracking, Client Portal, and Nav Updates

This plan batches all the requested features into 3 focused implementation messages to minimize credits.

---

### Message 1: Database Schema + Traffic Tracking + Nav Updates

**Database migrations (all in one):**
- Create `traffic_clicks` table: `id`, `source` (enum: tiktok, instagram, facebook, other), `other_details` (text, nullable), `created_at`
- Create `client_profiles` table: `id`, `user_id` (ref auth.users), `full_name`, `phone`, `business_name`, `billing_address`, `billing_city`, `billing_state`, `billing_zip`, `created_at`, `updated_at`
- Create `client_messages` table: `id`, `user_id`, `message`, `created_at`
- Create `client_documents` table: `id`, `user_id`, `title`, `file_url`, `uploaded_by` (admin or client), `created_at`
- Add RLS: `traffic_clicks` allows anonymous inserts; client tables are scoped to own user_id + admin read/write
- Create storage bucket `client-documents`

**Home.tsx changes:**
- Add 4 buttons below "Woman Owned..." line: TikTok, Instagram, Facebook, Other
- Each button inserts a row into `traffic_clicks`, then navigates to `/contact` (consultation booking)
- "Other" button shows a small dialog/popup asking where they found you, saves the text in `other_details`, then navigates to `/contact`

**Navbar.tsx changes:**
- Add "Emergency Contact" link (calls `tel:+14015891023`)
- Add "Client Login" button that opens a dialog with login/signup form

**Dashboard.tsx changes:**
- Add a "Traffic Sources" card showing counts by source from `traffic_clicks`

---

### Message 2: Client Auth + Portal Pages

**Client login/signup dialog:**
- Login tab: email + password sign-in
- Signup tab: email, password, full name, phone, business name, billing address fields
- On signup, insert into `client_profiles`
- On login success, redirect to `/portal`

**Client portal pages (new):**
- `/portal` — `ClientPortal.tsx` layout with sidebar tabs: Overview, Messages, Documents, Agreements, Payments
- **Overview**: Shows project status placeholder, welcome message
- **Messages**: Text field to submit notes/messages (saves to `client_messages`), shows history
- **Documents**: List of uploaded documents from `client_documents` (admin uploads for them)
- **Agreements**: Placeholder showing "DocuSign integration coming soon" with list of agreement records
- **Payments**: Placeholder for Stripe invoice links

**App.tsx**: Add `/portal` routes wrapped in a `ClientRoute` (authenticated, non-admin)

---

### Message 3: Admin-Side Client Management + Polish

**Admin dashboard updates:**
- Add traffic source counter widget with breakdown (TikTok / IG / FB / Other)
- Add client list view so admin can see registered clients
- Add ability for admin to upload documents to a client's `client_documents`

**Wire up remaining pieces:**
- Ensure client portal only shows data for the logged-in user
- Add sign-out button to portal
- Test that traffic buttons → consultation flow works end to end

---

### Technical Details

- **Files created**: `src/pages/portal/ClientPortal.tsx`, `src/pages/portal/ClientMessages.tsx`, `src/pages/portal/ClientDocuments.tsx`, `src/pages/portal/ClientAgreements.tsx`, `src/pages/portal/ClientPayments.tsx`, `src/components/ClientLoginDialog.tsx`, `src/components/ClientRoute.tsx`, `src/components/TrafficSourcePopup.tsx`
- **Files modified**: `src/pages/Home.tsx`, `src/components/Navbar.tsx`, `src/App.tsx`, `src/pages/admin/Dashboard.tsx`
- **Database**: 3 new tables + 1 storage bucket + RLS policies, all in one migration
- **Auth**: Client accounts use standard email/password signup (separate from admin). The existing `profiles` table trigger auto-creates a profile row; `client_profiles` stores extended billing info.
- **No DocuSign or Stripe invoice integration yet** — those tabs will be placeholders as requested ("we will build this out later on")

