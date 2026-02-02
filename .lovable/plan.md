
## Global Visual Tidy + Navigation Update

This plan covers navigation restructuring, button consistency, unified background treatment, logo replacement, and typography refinements across all pages.

---

### Task 1: Update Navigation Order + Highlight "Start Here"

**Current order:** Home | About | Services | Start Here

**New order:** Home | Services | About | Start Here (visually distinct)

**Changes to Header.tsx:**
- Reorder navLinks array to: Home, Services, About, Start Here
- Style "Start Here" as a button with sage background color
- Other nav items remain as text links

---

### Task 2: Replace Logo with New Watercolor Logo

**What we'll do:**
- Copy the uploaded watercolor "VibeShift Studio" logo to `src/assets/`
- Replace `vibe-shift-logo.jpg` references in Header.tsx and Index.tsx footer
- Increase logo size by 100% (from `h-12 md:h-14` to `h-24 md:h-28`)

---

### Task 3: Unified Fixed Background (All Pages)

**Current state:** Each page has different section backgrounds with gradient overlays

**New approach:**
- Use the watercolor background image as a fixed layer on all pages
- Increase opacity from 0.18 to approximately 0.27 (50% increase)
- Content scrolls over the fixed background
- Remove individual section gradient backgrounds for consistency

**Pages to update:**
- Index.tsx (homepage)
- Services.tsx
- StartHere.tsx
- About.tsx (already has fixed background, just adjust opacity)

---

### Task 4: CTA Button Consistency Check

**Audit findings:**
| Page | Button Text | Link | Status |
|------|-------------|------|--------|
| Index.tsx Hero | "Start Here" | /start-here | OK |
| Index.tsx Final CTA | "Start Here" | /start-here | OK |
| About.tsx | "Start Here" | /start-here | OK |
| Services.tsx (all 3 cards) | "Start Here" | /start-here | OK |
| Services.tsx Reassurance | "Start Here" | /start-here | OK |
| **StartHere.tsx** | **"Get Started"** | **none** | **NEEDS FIX** |

**Fix required:** Change "Get Started" button on StartHere.tsx to say "Start Here" and ensure consistent styling.

---

### Task 5: Button Style Consistency

**Standard button style (apply everywhere):**
- Background: sage color
- Shape: rounded-full
- Hover: bg-sage/90, slight lift (-translate-y-0.5)
- Shadow: shadow-warm, hover:shadow-warm-lg
- Text: white

**Files to check/update:** All page files with buttons

---

### Task 6: Typography Refinements

**Subheadings:** Make them slightly bigger and bolder
- Section labels (uppercase): Keep as-is
- Section h2 headings: Increase from `text-3xl md:text-4xl` to `text-3xl md:text-4xl lg:text-5xl` and add `font-semibold`
- Ensure one big headline per page (hero only)

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/assets/` | Add new logo image |
| `src/components/Header.tsx` | Reorder nav, style "Start Here" as button, update logo size and source |
| `src/pages/Index.tsx` | Fixed watercolor background, remove section gradients, update logo reference, typography tweaks |
| `src/pages/Services.tsx` | Fixed watercolor background, remove section gradients, consistent button styling |
| `src/pages/StartHere.tsx` | Fixed watercolor background, fix "Get Started" button text, remove section gradients |
| `src/pages/About.tsx` | Increase background opacity to ~0.27 |

---

### Visual Summary

```
text
BEFORE:                           AFTER:
+---------------------------+     +---------------------------+
| [logo] Home About Svcs    |     | [BIG LOGO] Home Svcs About|
|              Start Here   |     |              [Start Here] | <- button style
+---------------------------+     +---------------------------+
| Section 1 (gradient A)    |     | Fixed watercolor BG       |
+---------------------------+     | (higher opacity, scrolls) |
| Section 2 (gradient B)    |     |                           |
+---------------------------+     | Content scrolls on top    |
| Section 3 (gradient C)    |     |                           |
+---------------------------+     +---------------------------+
```

---

### Implementation Order

1. Copy new logo to assets
2. Update Header.tsx (nav order, logo, Start Here styling)
3. Update each page with fixed background treatment
4. Fix button text consistency
5. Apply typography refinements
