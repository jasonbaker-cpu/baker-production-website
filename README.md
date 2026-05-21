# Baker Production Website

Your website files, ready to upload and go live.

---

## What's in this folder

**Pages (the HTML files)**
- `index.html` — Your homepage. This is what people see first.
- `book.html` — Where customers pick their service and package.
- `checkout.html` — Where they enter their booking details (address, etc).
- `schedule.html` — Where they pick a date/time and pay.
- `confirmation.html` — The "booking confirmed" page they see after paying.
- `gallery.html` — Your photo gallery, organised by service type.
- `virtual-editing.html` — Standalone page for your virtual editing service.
- `about.html` — About page (placeholder content — needs your real story)
- `privacy.html` — Privacy policy (basic template — should be reviewed by a lawyer)
- `terms.html` — Terms of service (basic template — should be reviewed by a lawyer)

**Other files**
- `logo.avif` — Your logo (used in the navbar and footer).
- `favicon.ico` — The little icon that shows in browser tabs.
- `robots.txt` — Tells search engines what to crawl.
- `sitemap.xml` — Helps Google find all your pages.
- `img/` — Folder for all your photos. **Currently empty — see below.**

---

## ⚠️ Things still to do (in order of priority)

**1. Replace placeholder testimonials** — Find them in `index.html` (search for "TESTIMONIALS — PLACEHOLDER"). Swap with real Google reviews + real names + agency names. Required by Australian Consumer Law.

**2. Add your photos** — See `img/MISSING_IMAGES.txt` for the list of 89 expected filenames.

**3. Write your About page content** — Open `about.html`, replace the placeholder paragraphs with your real story.

**4. Have Privacy & Terms reviewed by a lawyer** — The included templates are starting points only. Specifically the cancellation policy in `terms.html` needs your actual policy.

**5. Submit your sitemap to Google** — Once your domain is connected, go to https://search.google.com/search-console, add your site, and submit `sitemap.xml`. This tells Google to start indexing.

**6. Set up Google Business Profile** — Free, separate from this site. Drives more local Perth enquiries than your website will. https://business.google.com

---

## ⚠️ IMPORTANT: Missing images

The site references about 80 images in the `img/` folder that aren't included yet.
Until you add them, parts of the site will show broken image icons.

There's a list of every missing filename in `img/MISSING_IMAGES.txt` —
hand it to whoever has the photos (probably you, on your hard drive).

The filenames are descriptive, e.g. `gal-aerial-1.webp` is "gallery aerial photo 1".
Just save your images with those exact names into the `img/` folder and they'll appear.

**Tip:** Convert your photos to `.webp` format before uploading — much smaller file sizes,
which means a faster site. Free tool: https://squoosh.app

---

## How to put this online (free, ~20 mins, one time)

### Step 1 — Make a GitHub account

1. Go to https://github.com and click "Sign up"
2. Pick a username (doesn't matter what)
3. Verify your email

### Step 2 — Upload these files to GitHub

1. Once logged in, click the green "New" button (top left) to make a new repository
2. Name it something like `baker-production-website`
3. Set it to **Public**
4. Tick "Add a README file"
5. Click "Create repository"
6. Click "Add file" → "Upload files"
7. Drag this entire folder's contents into the page (including the `img/` folder)
8. Scroll down, click "Commit changes"

### Step 3 — Connect to Cloudflare Pages

1. Go to https://pages.cloudflare.com and sign up (free)
2. Click "Create a project" → "Connect to Git"
3. Authorise Cloudflare to see your GitHub
4. Pick your `baker-production-website` repo
5. **Build settings:** leave everything blank/default — this is a plain HTML site, no build needed
6. Click "Save and Deploy"
7. Wait ~1 minute. You'll get a URL like `baker-production-website.pages.dev` — that's your live site!

### Step 4 — Connect your domain

1. In your Cloudflare Pages project, go to "Custom domains"
2. Click "Set up a custom domain"
3. Type your domain (e.g. `bakerproduction.com`)
4. Cloudflare will tell you exactly what DNS records to add
5. Add them at wherever your domain is registered (or transfer the domain to Cloudflare — it's the cheapest)
6. Wait 5–60 mins for it to propagate

Done. Your site is live at your domain.

---

## How to change something later

You don't need to re-upload anything. To edit a page:

1. Go to your GitHub repo (e.g. github.com/yourname/baker-production-website)
2. Click on the file you want to change (e.g. `index.html`)
3. Click the pencil icon (top right of the file view) to edit
4. Make your changes, scroll down, click "Commit changes"
5. Site updates automatically in ~30 seconds

Or, easier: **just message me what you want changed** and I'll do it for you.

---

## Quick reference: what to edit for common changes

- **Phone number / email / contact info** → Search across all files for the current ones
- **Prices** → Mostly in `book.html` and `index.html`
- **Service descriptions** → `index.html` and `virtual-editing.html`
- **Gallery photos** → Just swap the files in `img/` (keep the same filenames)
- **Logos of clients you work with** → `img/logo-*.webp` files

---

If anything breaks or you're stuck, just send me the error and what you were trying to do.
