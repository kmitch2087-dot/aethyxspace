

## Apply Grok Brand Package to Aethyx Website

### What Changes

Update the entire site's visual identity to match the Grok brand package specifications.

### 1. Color Palette Update (`src/index.css`)

| Token | Current | New (Brand Package) |
|-------|---------|-------------------|
| Background | `222 47% 4%` (navy #060a12) | `0 0% 4%` (near-black #0A0A0A) |
| Primary (teal) | `174 58% 55%` (#4ECDC4) | `174 100% 45%` (#00E6D8) |
| Card/glass | navy-tinted | neutral dark gray (#1A1A1A) |
| Foreground | warm off-white | pure white #FFFFFF |
| Muted/secondary | navy-tinted grays | neutral grays |
| Accent (purple) | Remove purple accent, replace with teal variations |

All gradient overlays in Home.tsx and other pages updated from navy hsl to true black.

### 2. Typography Update

**Current**: Cormorant Garamond (serif) for headings, Source Sans 3 for body.
**Brand Package**: Bold geometric sans-serif (Montserrat Black) for headings, Inter for body.

- Replace Google Fonts import in `index.css`
- Update `tailwind.config.ts` font families
- Change heading CSS rule from serif to the new geometric sans
- Update all `font-serif` class references across pages to `font-sans` or a new `font-display` utility

### 3. Tailwind Config Cleanup (`tailwind.config.ts`)

- Remove old Vibe Shift color tokens (sage, ocean, sand, cream, warm-white) that are no longer used
- Update font families to Montserrat + Inter
- Update box shadows from warm brown tints to neutral black

### 4. Files to Update

| File | Changes |
|------|---------|
| `src/index.css` | New color vars, new font imports, updated glass-card utilities |
| `tailwind.config.ts` | New fonts, remove legacy color tokens, update shadows |
| `src/pages/Home.tsx` | Update gradient overlay color from navy to black, update font classes |
| `src/pages/Services.tsx` | Update font classes from `font-serif` to new display font |
| `src/pages/Portfolio.tsx` | Same font class updates |
| `src/pages/About.tsx` | Same font class updates |
| `src/pages/Contact.tsx` | Same font class updates |
| `src/pages/TermsOfService.tsx` | Same font class updates |
| `src/components/Navbar.tsx` | No major changes needed |
| `src/components/Footer.tsx` | No major changes needed |

### 5. Brand Rules Applied

- 80% black/white for structure, 15% teal for energy
- Teal used sparingly: CTAs, highlights, logo accent, hover states
- No purple accent (removed)
- High contrast, lots of negative space
- Uppercase tracking on taglines and nav links (already done)

### Technical Notes

- Montserrat is available via Google Fonts (free)
- Inter is available via Google Fonts (free)
- No new dependencies needed
- All changes are CSS/styling only, no functional changes

