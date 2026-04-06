

## Aethyx Full Website Build

### Overview
Transform the current single-page rebrand landing into a complete 5-page premium website for Aethyx, a high-end web design company. Dark minimalist aesthetic, black and white with bold teal accents. The uploaded reference images will be copied into the project for use in portfolio galleries.

### Brand Identity
- **Tagline**: "Elevate & Evolve Unapologetically"
- **Logo**: Existing `src/assets/aethyx-logo.png` (teal accent on the A)
- **Palette**: Near-black background (#060a12 / #0a0f1a), white text, teal accent (#4ECDC4)
- **Typography**: Keep Cormorant Garamond for headings, Source Sans 3 for body. Bold, lots of negative space.

### Pages & Routing

**1. Homepage (`/`)**
- Hero: Background video (existing `aethyx-intro.mov`), logo, tagline "Elevate & Evolve Unapologetically"
- Services teaser: 3 cards linking to Services page (Web Design, Branding, Add-ons)
- Portfolio highlights: 3 thumbnail previews of Re Retreats, Kokopelli Kabin, Vibe Shift → Aethyx
- Strong CTA to Contact/Consultation

**2. Services (`/services`)**
- Preserve all existing service tiers, pricing, and add-ons from `stripePrices.ts`
- Tier 1: Online Presence Starter ($750)
- Tier 2: Professional Brand Website ($1,500-$2,000)
- Tier 3: Signature Brand Presence (Starting at $2,500)
- Quick services (Logo, Brand Assets, Maintenance)
- Add-ons grid (Email, Cloud, Dashboard, E-commerce, Booking, Analytics)
- App development section (Native + PWA)
- Consultation CTA at bottom (reuse existing Stripe edge function)

**3. Portfolio (`/portfolio`)**
- Three project albums with lightbox galleries:
  - **Re Retreats** (re-retreats.com): Women's Wellness Retreats in Southern Vermont. Tagline: "reset * restore * reimagine" / "Where Women Come Home to Themselves"
  - **Kokopelli Kabin** (kokopellikabin.com): Modern Mountain Retreat / luxury cabin rental
  - **Vibe Shift Studio → Aethyx** (vibe-shift.com): Rebranding story
- Each album: cover image, description, expandable photo gallery with lightbox
- Upload all 9 reference images into `src/assets/portfolio/`

**4. About (`/about`)**
- Rewrite existing About copy with Aethyx brand voice (bold, direct, unapologetic)
- Keep the core narrative about building websites for businesses that deserve better
- Updated brand positioning as Aethyx

**5. Contact (`/contact`)**
- Consultation booking form (reuse existing `create-consultation-payment` edge function and form logic from Rebrand.tsx)
- Direct contact info cards (phone, email)
- Calendar link for scheduling

### Shared Components

**Navigation** — New dark header component:
- Logo left, nav links right: Home, Services, Portfolio, About, Contact
- Sticky, glass-morphism dark style
- Mobile hamburger menu

**Footer** — Present on all pages:
- © Aethyx
- aethyxspace@protonmail.com
- 401.589.1023
- Rhode Island, serving the entire USA
- Privacy Policy link
- Terms of Service link

### File Changes

| Action | File |
|--------|------|
| Create | `src/components/Navbar.tsx` — New dark nav with mobile menu |
| Create | `src/components/Footer.tsx` — Shared footer |
| Create | `src/components/LightboxGallery.tsx` — Portfolio image lightbox |
| Create | `src/pages/Home.tsx` — New homepage |
| Create | `src/pages/Portfolio.tsx` — Portfolio with 3 albums |
| Create | `src/pages/Contact.tsx` — Contact + consultation form |
| Rewrite | `src/pages/Services.tsx` — Dark theme, same pricing data |
| Rewrite | `src/pages/About.tsx` — Aethyx brand voice |
| Update | `src/App.tsx` — New routes for all 5 pages |
| Update | `src/index.css` — Dark-first CSS variables, remove old Vibe Shift styles |
| Copy | 9 uploaded images → `src/assets/portfolio/` |
| Create | `src/pages/TermsOfService.tsx` — Basic terms page |

### Technical Details
- No new dependencies needed (lightbox built with native React state + Tailwind)
- Reuses existing `create-consultation-payment` edge function and all Stripe price IDs
- No new database tables or edge functions
- CSS variables updated to dark-first palette; old warm/sage/cream styles replaced
- All pages fully responsive with mobile-first approach

