

## Aethyx Rebrand Landing Page

### Overview
Create a new single-page rebrand announcement at the root route. All existing Vibe Shift Studio pages remain in the codebase but are removed from routing. The page has a dark, refined aesthetic with subtle cyan/teal and purple accents — bold and unconventional but professional.

### Brand Voice Direction
Bold, direct, unapologetic. Minimal copy, high impact. "Crafting Identity in the Unseen" as the tagline (from the uploaded logo). Language that signals creative authority without being corporate or trying too hard.

### Page Structure

```text
┌─────────────────────────────────────────┐
│  AETHYX logo image (centered)           │
│  "Crafting Identity in the Unseen"      │
│                                         │
│  Something new is taking shape.         │
│  Vibe Shift Studio is becoming Aethyx.  │
│                                         │
├─────────────────────────────────────────┤
│  THREE CONTACT CARDS (responsive grid)  │
│                                         │
│  [Emergency]     [Email]    [Consult]   │
│  Phone icon      Mail icon  Calendar    │
│  Call anytime     Non-urgent  Book $50  │
│  401-589-1023    Email btn   consultation│
│                                         │
├─────────────────────────────────────────┤
│  Consultation form (expands or modal)   │
│  Name, email, business name, textarea   │
│  for project details → Stripe $50 pay   │
│  → "Thank you! We will be in touch      │
│     very soon to confirm an appointment!"│
│                                         │
├─────────────────────────────────────────┤
│  Footer: © 2026 Aethyx                  │
└─────────────────────────────────────────┘
```

### Changes

**1. Copy uploaded logo to project**
- Copy `1E9E43F7-F3A7-4564-93F7-352810872ADE.png` to `src/assets/aethyx-logo.png`

**2. Create `src/pages/Rebrand.tsx`**
- Dark background (`#0a0a0f` or similar near-black) with subtle radial gradient accents in teal/purple
- Aethyx logo at the top, centered
- Brief rebrand announcement copy (bold, minimal)
- Three contact cards in a responsive grid:
  - **Emergency**: Red/warm accent, phone icon, "Client emergency? Call anytime" with tel: link to 401-589-1023
  - **General Contact**: Teal accent, mail icon, mailto: link to Aethyxspace@protonmail.com
  - **Book Consultation**: Purple accent, calendar icon, opens an inline form below or a dialog
- Consultation form collects: name, email, business name, brief project description (textarea)
- On submit: calls existing `create-consultation-payment` edge function → redirects to Stripe
- After Stripe success, show confirmation message
- Proton Calendar ICS link integrated as "View available times" link within the consultation card
- Minimal footer with copyright

**3. Update `src/App.tsx` routing**
- Change `/` route to render `Rebrand` instead of `Index`
- Comment out (not delete) all other routes so they're disabled but preserved
- Keep `/payment-success` active for Stripe redirect

**4. Update `src/pages/PaymentSuccess.tsx`**
- Update branding text from "Vibe Shift Studio" to "Aethyx"
- Update the confirmation message to: "Thank you! We will be in touch very soon to confirm an appointment!"
- Link back to `/` instead of other pages

**5. Styling approach**
- Dark refined palette: near-black background, off-white text, subtle teal (#4ECDC4) and purple (#7B68EE) accents on cards/borders
- Cards with glass-morphism effect (semi-transparent backgrounds, subtle borders)
- Clean sans-serif typography (Inter or system font stack for body, keep Cormorant Garamond for the tagline)
- Smooth hover transitions on cards
- No starfields or particle effects — just color, spacing, and typography

### Technical Details
- Reuses the existing `create-consultation-payment` edge function and Stripe price ID
- The Proton Calendar `.ics` URL will be linked as "View available times" — users can subscribe to see open slots
- No new database tables or edge functions needed
- No new dependencies needed

