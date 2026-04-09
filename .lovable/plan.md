

## Revised Plan: Minimal-Credit Blog + Admin Dashboard

### Goal
Deliver the same core functionality in ~3 implementation messages instead of 6+ phases.

### Message 1: Foundation (DB + Auth + Admin Shell)
- Create all database tables in one migration: `blog_posts`, `client_agreements`, `financial_records`, `user_roles`, `profiles`
- Set up RLS policies and `has_role` function
- Create admin login page and protected route wrapper
- Create admin layout with sidebar navigation (empty placeholder pages)
- Add `/blog` and `/blog/:slug` public routes (empty for now)

### Message 2: Blog System
- Public blog listing + single post pages with markdown rendering
- Admin blog manager: create, edit, delete, publish/unpublish posts
- Blog cover image upload via storage bucket
- Add "Blog" to navbar

### Message 3: Dashboard Views
- Dashboard home with summary stats
- Inquiries view (waiting list + contact submissions)
- Reviews management view
- Client agreements + financials tables (basic CRUD)

### What's deferred (add later if needed)
- Content calendar, email templates, task manager, analytics embed, notifications log
- These are nice-to-haves you can request one at a time later

### Technical approach
Same architecture as before (Shadcn sidebar, markdown editor, RLS-secured tables) — just bundled into fewer steps.

