# iMessage Link Preview Setup ✅

## What Was Done

I've added Open Graph metadata to your site so links shared on iMessage, Slack, Facebook, LinkedIn, and Twitter will display beautifully with:
- **Title**: "Pathway"
- **Description**: "Connect with verified tutors from top universities"
- **Image**: Purple card with your logo
- **Dimensions**: 1200x630 pixels (optimal for all platforms)

## Files Modified

1. **`src/pages/_app.tsx`** - Added global Open Graph meta tags
2. **`src/pages/index.tsx`** - Added specific meta tags for landing page
3. **`public/og-image-template.html`** - Template to create your OG image
4. **`public/og-image.svg`** - SVG version (backup)

## ⚠️ Action Required: Create the OG Image

You need to create `/public/og-image.png` (1200x630 pixels) with:
- Purple gradient background (#7c3aed → #a78bfa)
- Your logo in a white rounded box
- "Pathway" text
- Tagline

### Quick Methods:

**Option 1: Screenshot Method (Easiest - 2 min)**
```bash
# 1. Open the template
open public/og-image-template.html

# 2. In browser dev tools:
#    - Press F12
#    - Toggle device toolbar (Cmd+Shift+M)
#    - Set dimensions to 1200x630
#    - Take screenshot
#    - Save as public/og-image.png
```

**Option 2: Use Figma/Canva (5 min)**
1. Create 1200x630px design
2. Purple gradient background
3. Add white rounded rectangle + logo
4. Add "Pathway" text
5. Export as `public/og-image.png`

**Option 3: Use Online Generator**
- Visit: https://ogimage.vercel.app/
- Or: https://www.opengraph.xyz/
- Create and download as `og-image.png`

## Testing Your Preview

After creating the image and deploying:

1. **Test URLs:**
   - https://www.opengraph.xyz/url/https://pathwaytutors.org
   - https://metatags.io/
   - https://www.linkedin.com/post-inspector/

2. **Test in iMessage:**
   - Send link to yourself
   - Should show purple card with logo and "Pathway"

3. **Force Refresh (if not showing):**
   - iMessage: Delete and resend
   - Facebook: Use Sharing Debugger
   - LinkedIn: Use Post Inspector

## What the Preview Will Show:

```
┌─────────────────────────────────┐
│  [Logo]    PATHWAY              │
│  (white)   Your dream school.   │
│  (box)     Your major.          │
│            Your mentor.         │
│                                 │
│  Purple gradient background     │
└─────────────────────────────────┘
```

## Notes

- The metadata is now live in your code
- Once you create `/public/og-image.png` and deploy, links will preview beautifully
- The image should be 1200x630 pixels for best results across all platforms
- iMessage specifically looks for `og:image` meta tag (which we added)

