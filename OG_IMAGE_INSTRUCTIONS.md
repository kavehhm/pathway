# Creating the Open Graph Image for iMessage Previews

## Quick Method (Recommended)

### Option 1: Use Figma or Canva (5 minutes)
1. Create a new design with dimensions **1200x630 pixels**
2. Set background to purple gradient (#7c3aed to #a78bfa)
3. Add a white rounded rectangle (200x200px) in the center-left
4. Place your logo (`ourlogowhite.png`) inside the white rectangle
5. Add "Pathway" text in large white bold font (80px)
6. Add subtitle "Your dream school. Your major. Your mentor." below
7. Export as `og-image.png` and save to `/public/` folder

### Option 2: Screenshot Method (2 minutes)
1. Open the file `/public/og-image-template.html` in your browser
2. Set browser window to exactly 1200x630 (use browser dev tools)
3. Take a screenshot
4. Save as `/public/og-image.png`

### Option 3: Online OG Image Generator
1. Visit: https://ogimage.vercel.app/ or https://www.opengraph.xyz/
2. Title: "Pathway"
3. Subtitle: "Your dream school. Your major. Your mentor."
4. Upload your logo
5. Choose purple background (#7c3aed)
6. Download and save as `/public/og-image.png`

## Requirements
- **Dimensions**: 1200x630 pixels (required for iMessage/Facebook/LinkedIn)
- **Format**: PNG or JPG
- **Colors**: Purple (#7c3aed, #8b5cf6, #a78bfa) and white
- **Content**: 
  - Pathway logo (in white rounded box)
  - "Pathway" text
  - Tagline: "Your dream school. Your major. Your mentor."

## Testing
After creating the image:
1. Save it as `/public/og-image.png`
2. Deploy to Vercel
3. Test the link preview by pasting your URL in:
   - iMessage
   - Slack
   - Facebook
   - LinkedIn
   - Twitter

You can also test using:
- https://www.opengraph.xyz/url/https://pathwaytutors.org
- https://metatags.io/

