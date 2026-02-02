

## About Page + Background Image Implementation

This plan covers two tasks: using your watercolor image as a background element and creating the new About page with all the requested content.

---

### Task 1: Add Watercolor Background Image

**What we'll do:**
- Copy your uploaded watercolor image to the project assets folder
- Use it as a subtle, decorative background element on the About page (and optionally other pages)
- The image will be positioned with low opacity to maintain the calm, textured aesthetic without overwhelming the content

---

### Task 2: Create the About Page

**Page structure:**

| Section | Content |
|---------|---------|
| **Headline** | "About Vibe Shift Studio" |
| **Body copy** | Personal story about why the studio exists, the approach to design, and the calm philosophy |
| **Closing line** | "If your business has evolved, your website should reflect that." |
| **CTA** | "Start Here" button linking to `/start-here` |

**Design approach:**
- Single-column layout centered on readability
- Generous padding and breathing room
- Watercolor background image positioned subtly (low opacity, possibly blurred)
- Typography hierarchy matching existing pages (Cormorant Garamond headings, Source Sans 3 body)
- Consistent footer with other pages

---

### Task 3: Add to Navigation

**Update Header component:**
- Add "About" link to the navigation array
- Position it between "Home" and "Services" for logical flow

**Navigation order will become:**
Home | About | Services | Start Here

---

### Task 4: Add Route

**Update App.tsx:**
- Import the new About page component
- Add route at `/about`

---

### Technical Details

**Files to create:**
- `src/assets/watercolor-bg.jpg` (copied from upload)
- `src/pages/About.tsx`

**Files to modify:**
- `src/components/Header.tsx` (add About to navLinks)
- `src/App.tsx` (add route)

**Styling notes:**
- The watercolor image will be used as `background-image` with `background-size: cover`, `background-position: center`, and low opacity (around 0.15-0.25)
- May layer it with existing gradient backgrounds for depth
- Content will remain fully readable with proper contrast

