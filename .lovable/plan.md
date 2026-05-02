## Footer social link cleanup

LinkedIn is **already** in the footer (linking to `https://www.linkedin.com/company/aethyx/`), so no add is needed there. If that URL is wrong, let me know the correct one and I'll swap it.

### Changes to `src/components/Footer.tsx`
- Remove the YouTube link (`https://www.youtube.com/@aethyxspace`)
- Remove the Twitter / X link (`https://x.com/aethyxspace`)
- Drop the now-unused `Youtube` and `Twitter` icon imports from `lucide-react`

### Result
Footer socials become: **Facebook · Instagram · LinkedIn** — in that order, same styling, same spacing.

Nothing else changes.