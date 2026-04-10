
Goal
- Fix the admin sign-in loop first, then audit the admin buttons/forms so actions reliably submit, persist, and show clear feedback.

What I found
- Password login is succeeding in the backend repeatedly.
- Your admin user and admin role both exist in the database.
- The likely failure is frontend auth state timing: `useAuth` sets the user after login, but the admin-role lookup can run before authenticated queries are fully ready, resolve as non-admin, and never retry. That leaves you on `/admin/login` while the button briefly switches to “Please wait...” and back.

Implementation plan
1. Rebuild auth readiness flow in `src/hooks/useAuth.tsx`
- Separate session hydration, role lookup, and final auth readiness.
- Restore session cleanly, then handle later auth state changes.
- Only run the admin check after a confirmed session is available.
- Re-run the admin check when the session changes, not just when `user.id` changes.
- Reset auth/admin state cleanly on sign-out.

2. Make admin-role detection robust
- Stop relying on one immediate `user_roles` read during the login transition.
- Use a more reliable admin check flow so the role decision is not lost during token initialization.
- Add an explicit “signed in but not authorized” path so this never looks like a stuck login again.

3. Harden `AdminLogin.tsx`
- Keep submit loading separate from auth initialization/loading.
- After successful password login, wait for auth readiness instead of dropping straight back to idle.
- Show clear messages for bad credentials, missing admin access, and unexpected auth failures.
- Remove or disable the signup toggle if public signup is no longer meant to be used.

4. Audit the protected admin flow
- Verify `AdminRoute` does not bounce users back to login while auth is still resolving.
- Only redirect to `/admin` after admin access is confirmed.
- Confirm logout fully clears local admin state.

5. Fix the blog create/update flow after login is stable
- Re-test create/edit/publish/unpublish/delete in `BlogManager`.
- Add any missing validation, disabled states, error surfacing, and success toasts.
- Make sure form values hold while saving and that saved content persists after refresh.
- Verify cover image upload and post save sequencing works with the authenticated admin session.

6. End-to-end QA pass for the key buttons/forms
- Login
- Logout
- Create/update/publish blog post
- Inquiries actions
- Reviews approve/reject
- Agreements CRUD
- Financials CRUD

Technical details
- Files most likely to change: `src/hooks/useAuth.tsx`, `src/pages/admin/AdminLogin.tsx`, `src/components/AdminRoute.tsx`, and `src/pages/admin/BlogManager.tsx`.
- If needed, I’ll also make a small backend-side role-check adjustment so admin detection is reliable and secure during session startup.
- This should be a focused state-management and form-hardening pass, not a redesign.

Expected result
- Clicking “Sign In” should complete once, route into the admin dashboard, and stay logged in.
- Admin actions should submit once, persist correctly, and show clear success/error states instead of silently failing.
