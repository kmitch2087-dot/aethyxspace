

## Homepage Styling Refinement Plan

This plan creates a calm, warm, and intentionally designed homepage by replacing the watercolor background with soft muted cream, refining the services section into distinct grounded cards, and polishing the overall visual hierarchy.

---

### Overview of Changes

| Area | Current State | New State |
|------|--------------|-----------|
| Background | Fixed watercolor image at 27% opacity | Soft, muted cream solid background |
| Services Cards | `card-elevated` with warm shadow | Distinct cards with rounded corners, subtle border, light cream background |
| Typography | Mixed weights | Cleaner hierarchy, consistent weight usage |
| Overall Feel | Organic/watercolor aesthetic | Warm, calm, quietly confident |

---

### Task 1: Replace Watercolor Background with Muted Cream

**File:** `src/pages/Index.tsx`

**What changes:**
- Remove the fixed watercolor background `div` (lines 14-20)
- Apply the existing `--cream` color variable (`42 38% 94%`) as the page background
- This creates a soft, warm foundation without busy patterns

**Result:** A clean, warm cream backdrop that feels intentional and calm.

---

### Task 2: Refine Services Cards Styling

**File:** `src/index.css`

**What changes:**
- Create a new utility class `.card-service` specifically for service cards:
  - Background: `hsl(var(--warm-white))` (slightly lighter than page background for separation)
  - Border: Very subtle `1px solid` using `hsl(var(--border) / 0.4)` 
  - Border radius: `rounded-2xl` (16px) - softer than current `rounded-3xl`
  - Shadow: Softer, more diffused shadow for grounded feel
  - Remove the heavy warm shadow on hover

**File:** `src/pages/Index.tsx`

**What changes:**
- Replace `card-elevated` with new `card-service` class on the three service cards
- Reduce hover lift effect from `-translate-y-1` to `-translate-y-0.5` (more subtle)
- Remove the `hover:shadow-warm-lg` in favor of consistent subtle elevation

---

### Task 3: Typography Cleanup

**File:** `src/pages/Index.tsx`

**What changes:**
- Ensure consistent heading weights:
  - H1 (hero): Keep `font-medium` for elegance
  - H2 (section titles): Keep `font-semibold`
  - H3 (card titles): Change to `font-medium` (currently mixed)
- Body text: Ensure `font-normal` or `font-light` for paragraph text (remove `font-bold` from "Choose Your Path" description)
- Remove `heading-accent` underline decoration for cleaner look

---

### Task 4: Deliverables Section Refinement

**File:** `src/pages/Index.tsx`

**What changes:**
- Apply same `card-service` styling to deliverable cards
- Reduce visual weight of this section (smaller icons, subtler presentation)
- Keep it functional but not competing with main services

---

### Task 5: Process Section Cards

**File:** `src/pages/Index.tsx`

**What changes:**
- Apply `card-service` styling to process step cards
- Reduce the hover shadow intensity
- Keep step numbers in paint splats but ensure they feel integrated

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Index.tsx` | Remove watercolor BG, apply cream background, update card classes, refine typography |
| `src/index.css` | Add new `.card-service` utility class with calm, grounded styling |

---

### Visual Summary

```text
BEFORE:                              AFTER:
+-----------------------------+      +-----------------------------+
| Watercolor BG (27% opacity) |      | Solid muted cream BG        |
| Heavy warm shadows on cards |      | Subtle shadows + soft border|
| Strong hover effects        |      | Gentle hover lift           |
| Mixed typography weights    |      | Clean consistent hierarchy  |
+-----------------------------+      +-----------------------------+

Service Card Comparison:
+------------------+              +------------------+
| card-elevated    |              | card-service     |
| - white bg       |      -->     | - warm-white bg  |
| - warm shadows   |              | - subtle border  |
| - heavy hover    |              | - gentle shadow  |
+------------------+              +------------------+
```

---

### New CSS Class Definition

```css
.card-service {
  @apply relative overflow-hidden rounded-2xl;
  background: hsl(var(--warm-white));
  border: 1px solid hsl(var(--border) / 0.5);
  box-shadow: 
    0 1px 2px rgba(0, 0, 0, 0.02),
    0 2px 8px rgba(0, 0, 0, 0.03);
  transition: all 0.3s ease;
}

.card-service:hover {
  box-shadow: 
    0 2px 4px rgba(0, 0, 0, 0.03),
    0 4px 12px rgba(0, 0, 0, 0.05);
}
```

---

### Implementation Order

1. Add `.card-service` class to `src/index.css`
2. Update `src/pages/Index.tsx`:
   - Remove watercolor background
   - Add cream background to page
   - Replace card classes on services, deliverables, and process sections
   - Clean up typography weights

