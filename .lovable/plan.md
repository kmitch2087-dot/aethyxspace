

## Rebrand to Match Aethyx Brand Package Mockups

Based on the uploaded mockups, I'll restructure each page to match the architecture shown, while using correct spelling and real copy (ignoring Grok's placeholder/misspelled text).

### 1. Home Page (`src/pages/Home.tsx`)

**Current**: Video hero with logo image, 3 service cards, 3 portfolio highlights, CTA section.

**Target (from mockups)**: 
- Hero with large Aethyx logo mark (triangle A), "Elevate & Evolve Unapologetically" headline, "Premium web design & digital experiences for ambitious brands" subtitle, teal "Get Started" button, "RI-based • Serving USA" text below
- Services teaser section with icon thumbnails + descriptions (keep existing 3-card layout but add the mockup's icon style)
- Portfolio teaser section (keep existing)
- CTA section at bottom

### 2. Services Page (`src/pages/Services.tsx`)

**Current**: Pricing tiers grid, quick services, add-ons tables.

**Target (from mockup)**: Add a visual header section with "Services" title + "Elevate your digital presence with our bespoke solutions" subtitle, then show service categories as large stacked glass cards with geometric line icons (globe for Web Design, diamond for Branding & Identity, play button for Digital Experiences) and teal "Learn More" buttons. Keep existing pricing tiers and add-ons below.

### 3. Portfolio Page (`src/pages/Portfolio.tsx`)

**Current**: Accordion-style expandable project cards.

**Target (from mockup)**: Featured project hero at top with large title + "View Case Study" button, then 3 project cards in a grid below with image thumbnails and "View Case Study" buttons. Keep the lightbox gallery functionality but restructure the layout.

### 4. About Page (`src/pages/About.tsx`)

**Current**: Single-column text with CTA.

**Target (from mockup)**: 
- "About Aethyx" heading with body paragraphs
- Teal dot separator dividers between sections
- "Elevate & Evolve Unapologetically" bold tagline section with supporting text
- Two side-by-side glass cards with teal gradient: "Our Team" and "Our Values"

### 5. Contact Page (`src/pages/Contact.tsx`)

**Current**: 3 contact method cards + consultation booking form.

**Target (from mockup)**: Simplified layout — "Contact Page" heading, brief intro text, form (Name, Email, Message) with teal Submit button, then "Direct Contact" section below with email, phone, location. Keep existing Stripe consultation payment functionality but integrate it more cleanly.

### 6. Navbar (`src/components/Navbar.tsx`)

**Current**: Logo image + text links.

**Target (from mockup)**: Show "Aethyx.space" text or the A icon mark on left, nav links on right (Home, Services, Portfolio, About, Contact). The mockup shows a clean horizontal nav with the brand wordmark.

### 7. Footer (`src/components/Footer.tsx`)

**Current**: 3-column grid with brand, contact, links.

**Target (from mockup)**: Simpler single-row or two-row footer: email + phone on left, Privacy Policy + Terms of Service on right.

### 8. Favicon Update

Use the uploaded 512x512 Aethyx app icon as the favicon, replacing the current external URL.

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/pages/Home.tsx` | Restructure hero, add "RI-based" text |
| `src/pages/Services.tsx` | Add visual service category cards above pricing |
| `src/pages/Portfolio.tsx` | Restructure to featured hero + card grid |
| `src/pages/About.tsx` | Add dot dividers, Our Team/Values cards |
| `src/pages/Contact.tsx` | Simplify to form + Direct Contact section |
| `src/components/Navbar.tsx` | Update to "Aethyx.space" wordmark style |
| `src/components/Footer.tsx` | Simplify layout |
| `public/favicon.png` | Copy uploaded 512x512 icon |
| `index.html` | Update favicon reference |

### Spelling / Copy Notes

All Grok-generated placeholder text will be replaced with the correct real copy that's already in the codebase. Key correct values:
- Brand name: **Aethyx** (not "Aethxy" or "Rethyx")
- Tagline: **Elevate & Evolve Unapologetically**
- Email: **aethyxspace@protonmail.com**
- Phone: **401.589.1023**
- Location: **Rhode Island • Serving the entire USA**
- Portfolio: **Rē Retreats** (not "Rō"), **Kokopelli Kabin**, **Vibe Shift Studio → Aethyx**

