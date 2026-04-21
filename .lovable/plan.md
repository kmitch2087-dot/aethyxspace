
## Add Founder Photo + Rewrite About Page (Solo Founder Voice)

Two coordinated changes: place Kristin's photo on the About page, and rewrite the site-wide "team/we" language to reflect that Aethyx is a solo founder studio — owned with pride.

### 1. About page rewrite (`src/pages/About.tsx`)

**New layout:** Two-column intro on desktop (photo left, heading + opening paragraphs right), stacks on mobile. Rest of page keeps its rhythm but gets new copy.

**New copy (in brand voice — confident, founder-led, no fluff):**

Intro section (next to photo):
> # About Aethyx
>
> Aethyx is me — Kristin Mitchell. One founder, one studio, every pixel.
>
> I built this because I kept watching brilliant, hard-working people hide behind websites that didn't come close to matching who they actually are. Too cluttered. Too generic. Too easy to scroll past.
>
> Aethyx is my becoming — the thing I built brick by brick, late night by late night, until it became something I'm genuinely proud of. And now I get to do the same for other people: help them see what's actually possible.

Mid-section heading + sub:
> ## Elevate & Evolve Unapologetically
> No team to hide behind. No account managers, no handoffs, no "someone will get back to you." You work directly with me — the person designing it, writing it, building it, and obsessing over it until it's right.

Closing paragraphs:
> My favorite part of this whole job is the reveal. The moment a client sees their site for the first time and realizes what's actually possible now — the automations, the workflows, the things running quietly in the background — and the fear flips into awe.
>
> Most people think a more advanced website means more work for them. It's the opposite. Done right, it means *less* — fewer manual tasks, fewer things to remember, more time to actually do the work you're here to do.
>
> *That's the whole point. Your business has evolved. Your website should prove it — and then get out of your way.*

**Cards section — replace "Our Team" + "Our Values":**

Card 1 — **The Studio** (Users icon):
> Aethyx is a one-woman studio led by Kristin Mitchell. That means every decision, every line of copy, every detail is mine — and I take that personally. No subcontractors. No silent partners. Just direct, founder-led work from start to launch.

Card 2 — **What I Stand For** (Target icon):
> Bold over safe. Clarity over complexity. Craft over shortcuts. Every business deserves a digital presence that commands respect — and I don't stop until yours does.

### 2. Photo placement

- Save uploaded image to `src/assets/kristin-founder.jpg`
- Import into About.tsx
- Wrapper: `rounded-2xl overflow-hidden border border-primary/20 shadow-[0_0_40px_-10px_hsl(var(--primary)/0.3)]`, max-height constrained on mobile
- Caption underneath: "Kristin Mitchell — Founder"
- Layout: `grid md:grid-cols-2 gap-10 items-center` on intro row only; container widens to `max-w-5xl` for that row, rest stays `max-w-3xl`
- `alt="Kristin Mitchell, Founder of Aethyx"`, `loading="eager"`

### 3. Site-wide "we → I" sweep

Change team/plural language to solo-founder voice across these files (only the customer-facing copy, not variable names or RLS/legal text):

- `src/pages/Home.tsx` — any "we build / our team / we believe" → "I build / I / I believe"
- `src/pages/Services.tsx` — service descriptions, intros
- `src/pages/StartHere.tsx` — funnel copy
- `src/pages/Contact.tsx` — intro / reassurance lines
- `src/pages/Rebrand.tsx` — narrative
- `src/pages/Seo.tsx` — explainer copy
- `src/pages/Membership.tsx` — pitch copy
- `src/pages/MedSpa.tsx` — only the brand-voice sections (keep medspa positioning intact)
- `src/pages/Portfolio.tsx` — project intros
- `src/components/Footer.tsx` — tagline if applicable

**Preserved unchanged:** Privacy Policy, Terms of Service (legal "we/Aethyx" is standard), admin/portal interfaces, button labels, technical copy.

**Approach:** read each file, replace only marketing prose where "we/our/us/team" implies multiple people. Keep "Aethyx" as the brand name where it reads better than "I" (e.g. "Aethyx is built on…" stays).

### 4. Memory updates

- Update `mem://features/about-page` to reflect solo-founder narrative + photo
- Update `mem://brand/aethyx-tone` to add: "Solo founder voice — use 'I' not 'we'. Aethyx is Kristin Mitchell. Take pride in the one-woman studio positioning rather than hiding it."
- Update `mem://index.md` Core to note: "Solo founder studio — Kristin Mitchell. Use 'I' in marketing copy, not 'we/our team'."

### Technical details

- Files edited: `src/pages/About.tsx`, `src/pages/Home.tsx`, `src/pages/Services.tsx`, `src/pages/StartHere.tsx`, `src/pages/Contact.tsx`, `src/pages/Rebrand.tsx`, `src/pages/Seo.tsx`, `src/pages/Membership.tsx`, `src/pages/MedSpa.tsx`, `src/pages/Portfolio.tsx`, `src/components/Footer.tsx`
- New asset: `src/assets/kristin-founder.jpg` (copied from upload)
- Memory: 3 files written/updated
- No DB, no schema, no edge functions, no new dependencies
