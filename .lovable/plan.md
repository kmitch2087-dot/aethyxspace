

## Plan: Rich Blog Editor + Append SEO Content to Posts 1 & 2

### Part 1 — Upgrade the admin Blog editor

Replace the plain Markdown textarea with a **WYSIWYG rich-text editor** (TipTap, the modern industry standard) so you can format visually like Google Docs — no Markdown knowledge required. Output is stored as HTML so all formatting is preserved exactly when published.

**Editor toolbar will include:**
- Headings (H1, H2, H3)
- Bold, italic, underline, strikethrough
- **Font family picker** (Montserrat, Inter, Playfair, Georgia, system serif, system sans, monospace)
- **Font size picker** (small → XL)
- **Text color picker**
- Bulleted & numbered lists
- Blockquotes, code blocks, horizontal rules
- **Hyperlinks** (paste URL, sets anchor text — perfect for your internal link sections)
- Image insertion (URL or upload to `blog-covers` bucket)
- Undo / redo

**Auto-formatting on publish:**
- Paragraph spacing handled automatically (proper `<p>` margins via Tailwind `prose` styles)
- Headings get the Aethyx Montserrat display font + tracking
- Links inherit the teal accent color
- Blockquotes get a left border + italic styling
- Lists get proper indent + spacing

### Part 2 — Update `BlogPost.tsx` (public reader)

Render HTML safely (TipTap output is sanitized) inside a styled `prose` container so the formatting you set in the editor shows up identically on the live page.

### Part 3 — Backward compatibility

Old posts are stored as Markdown. The reader will detect HTML vs Markdown (HTML starts with `<`) and render appropriately, so nothing breaks.

### Part 4 — Append SEO content to existing posts

I'll convert your provided SEO content (Internal Links section + FAQ section + FAQ Schema note) into properly formatted HTML and **append** it to:
- **Post 1** — "Small Business SEO" (uses links: /website-design-services, /custom-website-development, /how-much-does-a-small-business-website-cost, /signs-your-business-needs-a-new-website, /contact)
- **Post 2** — "Website Pricing Guide 2026" (uses links: /website-design-services, /custom-website-development, /small-business-seo-services-website-design, /signs-your-business-needs-a-new-website, /contact)

Both will get a proper "Suggested Internal Links," "Frequently Asked Questions," and "FAQ Schema Ideas" section with anchor links, H2/H3 hierarchy, and clean spacing. Once appended, you can re-edit them visually in the new editor anytime.

### Part 5 — JSON-LD FAQ schema (SEO bonus)

Since you mentioned FAQ Schema, I'll auto-detect FAQ sections in posts and inject **FAQPage JSON-LD structured data** into the `<head>` of each blog post page, so Google can show rich FAQ results in search.

### Files to change
- `src/pages/admin/BlogManager.tsx` — swap textarea for new editor component
- `src/components/blog/RichTextEditor.tsx` — **new**, TipTap editor with full toolbar
- `src/pages/BlogPost.tsx` — render HTML, inject FAQ JSON-LD, handle legacy Markdown
- `src/index.css` — add `.blog-content` styles for consistent typography
- Append SEO HTML to both posts via DB insert tool

### Dependencies to add
- `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `@tiptap/extension-image`, `@tiptap/extension-text-style`, `@tiptap/extension-color`, `@tiptap/extension-font-family`, `@tiptap/extension-underline`

### What stays the same
- Slug auto-generation, cover image upload, publish toggle, drafts table — all unchanged
- Existing 2 posts keep their current content, just get the new sections appended
- Brand colors, fonts, and tone preserved

Want me to proceed?

