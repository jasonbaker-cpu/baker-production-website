# Daily drone edit: runbook

The daily scheduled task follows this. Goal: by morning, every drone job from yesterday is edited, checked and published at
`bakerproduction.com/aerials/<day-id>/`, and can be opened in the editor (`/pins` → Previous days).

## 0. Setup (container)
```
git clone -b aerial-pipeline https://github.com/jasonbaker-cpu/baker-production-website.git ~/aerial && cd ~/aerial
git clone https://github.com/jasonbaker-cpu/baker-production-website.git ~/site      # main branch = the live site
pip install --break-system-packages rawpy tifffile opencv-python-headless playwright pillow numpy >/dev/null
python3 editor/build.py
```
Chromium is already installed for Playwright (`/opt/pw-browsers`).

## 1. Find yesterday's drone jobs
- Google Calendar `admin@bakerproduction.com`, yesterday (Perth time). A job counts if its description lists "Aerial / Drone Photography".
- For each job, read:
  - address
  - listing agent and their email domain → pin style via `agency_map.json`. If the domain isn't listed, use plain grey pins (`grey`, Jason 28 Oct) and flag it.
  - "Any specific boundaries or land features to mark" → `must` places
  - strata answer and land size

## 2. Get the files (Dropbox connector)
**Use everything in the job's Dropbox folder, not just the photos (Jason, 26 Oct).** Before editing, read every non-photo file in the
job folder (all subfolders, e.g. `Aerial - Drone Photography` and `Floorplan or Drone`):
- `*_qa.txt` / `*_directions.txt` / `*_map.html`: the amenity list for pins (three map formats exist; the editor reads all of them).
- Certificate of Title, Survey-Strata Plan, deposited plan, agent sketches, screenshots, emails saved as images: these set the
  lot size, side lengths and lot shape. Title/plan figures beat the cadastre: put them in the day file as `"area"` and `"lens"`
  (lens in edge order). If the agent says a site is being subdivided, make one job per lot (`<slug>_lot1`, `<slug>_lot2`),
  each with only its own boundary, area and side lengths, and its own places file centred on that lot.
- Booking "specific boundaries or land features to mark" → `must`.
- Check the drone files really are this address: GPS in the DNG must be within ~150 m of the address. If a folder holds another
  job's flight (same file names/content hash as another folder), stop and tell Jason; don't edit it.
- Skip ground-level frames (RelativeAltitude ≈ 0).
- Raw folder: `Raw Files/<Photographer>/<DD-MM-YYYY>/<address>/Aerial - Drone Photography`. Search for the address with the Dropbox tool.
- Get `download_link` for the DJI files plus the `*_map.html` and any title or strata PDFs, then `curl` them into `batch/<slug>/raw/`.
- Slug: the street part of the address, lowercase, with underscores (e.g. `28_george_st`).
- DNG only (no JPG): run `python3 dng2jpg.py batch/<slug>/raw/*.DNG` and move the jpgs into `batch/<slug>/jpg/`. Drone XMP is kept.
- No `*_map.html`: build `batch/<slug>/<slug>_places.json` WITHOUT TomTom (Jason 28 Oct: TomTom refuses the key — make no TomTom calls). Sources in order: Project doc claude/amenity-known-changes*.md, `amenity_ref.py <lat> <lng> <dir>` (claude/amenity_ref.py + claude/amenity-perth-reference.json), then `amenity_arcgis.py` (claude/amenity_arcgis.py, rules in claude/amenity-brief-fallback.md: named verify for every ArcGIS pin, stations never from ArcGIS alone), WebSearch to settle names. Use the format below. Pick 8–14 real amenities: schools, shopping centres, stations, beaches, parks, golf. Skip childcare businesses, driving schools and dance studios.
  ```
  {"address":..., "lat":..., "lng":..., "pins":[{"name","cat","lat","lng"}]}
  ```
  `cat` is one of: train, shopping, school, park, beach, golf, lake, reserve.

## 3. Boundary and satellite (needs Jason's Mac: Claude Browser pane)
- Open `https://bakerproduction.com/pins/` in the Browser pane (tab `seed`).
- **Cadastre.** In the page, fetch:
  ```
  https://public-services.slip.wa.gov.au/public/rest/services/SLIP_Public_Services/Property_and_Planning/MapServer/2/query
  geometry=<lng>,<lat>  geometryType=esriGeometryPoint  inSR=4326  spatialRel=esriSpatialRelIntersects
  outFields=*  returnGeometry=true  outSR=4326  f=json
  ```
  Use the first ring as `poly` (convert to [lat,lng]).
  - Strata, unit or townhouse with no survey-strata lot → no `poly` (pins only).
  - If the booking gives a land size, it must agree with the cadastre area within about 3%. Otherwise flag it.
- **Satellite.** Run the `mosaic.js` function body in the page as `mos(lat,lng,18,6,0.85)` and store the result in `window.__S[slug]`.
  Then fetch chunks with:
  ```
  window.__chunk=(k,i)=>{const s=window.__S[k], n=Math.max(1,Math.floor(s.length/200000)), L=Math.ceil(s.length/n); return 'CHUNK|'+k+'|'+i+'|'+n+'|'+s.slice(i*L,(i+1)*L)+'|END|';}
  ```
  Equal chunks of at least 200k characters get saved to tool-result files. Rebuild them into `sat/<slug>.jpg` and `sat/<slug>.json` (`{z,x0,y0,N}`), the same way as `assemble.py` in the session.
- If the Mac can't be reached, skip satellite and cadastre. Pins still work from the drone data. Note it in the report and leave out boundaries unless a title or strata plan gives one.

## 4. Run
Every oblique photo is levelled automatically in `prep_day.py` (`straighten.py`: skyline fitted, rotated + zoomed, camera roll/zoom carried into the editor). The highest straight-down shot is used for the boundary. Texture defaults are the natural look (fine 1.3 / mid 1.0 / LUT 20%); don't raise them.

```
# days/<day-id>.json  — see prep_day.py docstring (slug, addr, who, agency, photos dir, map, poly, must)
echo '[{"slug":"<slug>","photos":[...jpgs...]}, ...]' > e2e/reg.json && python3 regall.py e2e/reg.json   # satellite line-up (skips jobs without sat)
python3 prep_day.py <day-id>
python3 runjobs.py e2e/run_<day-id>.json
```
`day-id` looks like `23-oct-2026`.

## 5. Check (always — the fence check is mandatory, publishing refuses without it)
1. For every top-down: `python3 edgeruler.py <slug>__nadir` (strips in qc/er_<slug>__nadir_*.jpg, UP = outside lot).
2. Spawn a NEW independent subagent (it must not see your earlier conclusions) to read the strips and return per-edge fence offsets as JSON {"<slug>":[{"edge","offset_m","confidence"}]}.
3. `python3 fencefix.py <day-id> checks.json` — records e2e/fence_<slug>__nadir.json; edges >0.3 m off (med/high confidence) go into edgeOff.
4. If any FIX: `python3 prep_day.py <day-id>`, re-run only those `__nadir` jobs, edgeruler again, a fresh independent check, fencefix again. Repeat until PASS (max 3 rounds; if still failing, publish with SKIP_FENCE=1 and flag it in the report).
5. Contact sheets: look at every photo yourself + an independent subagent QC of the horizon band. Fix or flag: wrong agency pin style, clipped/overlapping pins, horizon halo/fog/ghosting, lot area vs title mismatch.

## 6. Publish
```
SITE=~/site python3 mkday.py <day-id> "<Day DD Mon YYYY>" e2e/run_<day-id>.json e2e/meta_<day-id>.json
cd ~/site && git add aerials && git commit -m "Aerials <day>" && git push
```
Commit lines must end with the attribution the session gives.

## 7. Report
Send Jason a short message:
- the gallery link
- jobs done
- anything flagged (no map, strata, Mac offline, area mismatch, QC issues)

Push-notify him.

## 26 Oct fixes (automatic in the editor, nothing to do per job)
- Horizon haze: the new-sky fade line is now smoothed (no more grey boxes of old sky beside hills/buildings).
- Beach pins charted offshore are walked toward the house until they sit on sand.
- Zoo / wildlife / sanctuary places get the park icon, never shopping.
- Strata lots: if the cadastre only returns the shared parent lot (several identical features), leave the boundary off unless a strata plan is in Dropbox (e.g. 8a Coogan Cl).

## Quality gates (26 Oct — every day, before committing)
1. **Agency branding.** The booking email domain picks the style from `agency_map.json`. A domain that isn't in the map is NEVER guessed:
   open the agency's website, read the logo (franchise brand = franchise style, e.g. armadalerealestate.com.au is Professionals → `flags-p`),
   add it to the map, and note it in the report. If the agency has no clear brand colour (or the site can't be read), use `grey` — the default (Jason 28 Oct), never red. Century 21 = Obsessed Grey pins + Relentless Gold house pin (`c21`).
2. **Pin locations.** Collect the pins actually shown (from `e2e/report_<slug>.json`) with their map coordinates, then run
   `python3 pinverify.py qc/pins_shown.json`. ArcGIS is noisy (police stations, same-name places elsewhere), so check each FAR/NOMATCH
   by hand: if a second source puts the place >250 m away, fix the coordinate (a council page or street address beats both) and the spelling.
3. **Portal parity.** After `mkday.py`, run `python3 parity.py <day> <run.json>`. It renders the 3000 px files the portal loads and
   compares them with the gallery. Anything but `PARITY PASS` = don't publish; look at `qc/parity_<day>.jpg`.
   Then replay the portal itself: serve the website repo (`python3 -m http.server 8766 --directory <website repo>`) and run
   `node portalcheck.js <day> <slug> <slug> ...`. It opens `/pins/?open=<day>/<slug>` exactly as a VA does (saved project, registered
   camera) and saves every finished photo to `qc/portal/<day>_<slug>.jpg`. Look at every sheet: no grey bands/boxes above the horizon.
   (26 Oct: the portal finished photos with the registered camera and clamped the sky ~130 px too high; the batch never showed it.)
4. **Places.** At most 4 places per photo. Small parks, reserves and playgrounds only within 1.5 km. Nothing beyond 6 km unless it's
   a station, regional shopping centre, hospital, beach, regional park, golf course or lake.

## 27 Oct
- Twilight / sunset shoots: set `"noSky": true, "noFinish": true` on the job in days/<day>.json — keeps the real blue→orange sky and the dusk mood (no daytime sky, no brightening).
- Late uploads for a day already published: publish with `MERGE=1 python3 mkday.py ...` so the earlier jobs stay.
- mkday now refreshes final_aerials/<slug> from e2e/ itself (a stale folder had put old edits in the gallery).
- Amenity maps with `{n, la, lo, t}` records are read too (they were showing no pins).

## 27 Oct — twilight sky + towers
- Sky plate "S" = editors' Rutland sunset (blue top → peach horizon, from DSC03542). Use `"skyPlate": "S"` in the day json for dusk/twilight jobs; project.json keeps the plate so the portal reopens with it.
- Tall buildings above the horizon are no longer painted over: land guard reaches 10% of frame height, and brick/dark solids connected to the horizon are kept (dark clouds are not — they aren't connected).

## 27 Oct (Tue 27 run)
- Scripts no longer need the old session scratchpad: t12/mkday/parity run from the clone (fonts/ in the repo); `SITE=~/site` is honoured by mkday and parity; `python3 assemble.py <this session's tool-results dir>`. Create `qc/` before edgeruler (it fails silently without it).
- DJI Fly app exports (photos saved from the phone, ~14 MB) have GPS but NO drone XMP (no gimbal pitch/yaw/height). Run `python3 estpose.py <slug> <house_lat> <house_lng> batch/<slug>/raw/*.JPG` after the satellite is in `sat/` (keep a copy of the originals first; run top-downs separately with `NADIR=1`). It solves yaw/pitch/height against the satellite and writes an XMP packet so the rest of the pipeline works. Check with `python3 regview.py <slug> <photos>`.
- If the skyline finder can't level a flight (hazy horizon, "no-change" on every photo), measure it by hand and set `"level": <deg, + = right side high>` on the job in days/<day>.json; prep_day applies it to every oblique.
- Top-down jobs with no registered camera lost their boundary (t12 only treated a photo as top-down when a registered camera said so) — fixed. If a satellite registration of a top-down scores low, check the lot is parallel to the street; a bad one rotated Balga's lot 7°. Mini 4 Pro RelativeAltitude can read high on top-downs: size the lot to the fences (h is in the reg_all cam).
- Newer amenity maps use short categories (shop, zoned, privschool, rec, edu); the editor now maps them (they were never pinned before). Live /pins editor on main still has the old loader until the editor build is deployed.
- Agent-requested places beyond the distance rules (e.g. "Perth CBD") must be in the places file and in `must`; must places now skip the 1.5 km / 6 km filters.
## 28 Oct — triple-check fixes
- agency_map: rodwaygroup.com.au → rodway (black pins, black boundary), professionals.com.au → flags-p. Karangi (Rodway) went out red because the domain was missing.
- Agency styles can carry `line` (boundary colour); rodway = #2A2A2A.
- Booking "specific boundaries or land features to mark" MUST go in `must` AND every one must exist in the places file — add any that are missing (Google coordinates) before running. Lathlain went out without Crown/Optus because of this.
- Never publish an address of "Property": set the real address in the places file / project.
- Solid-object keep (towers above the horizon) compares against sky 18–30% of frame height above the horizon (a frame-wide median kept the dark side of a dusk sky) and follows a building up to 28% of frame height. Land guard is back to 5% (10% put a pale arc beside tall buildings).
- portalcheck waits until the thumbnail count stops growing (it used to capture after the first thumb).

## 28 Oct 2026 — 3 pins per location photo (Jason)
- Every oblique (location) photo carries **3 amenity pins** — not 2, not 4. t12.py `TARGET = job.perPhoto or 3`; if the strict list can't reach 3 it falls back to any other in-view place (still never childcare/kindy/driving/dance).
- Labels may sit above/below the pin when left/right would overlap (render.js tidySides). Still no stems, no overlaps, nothing off-frame.
- If a photo can't fit 3 clean pins, drop that photo rather than show 1–2 pins, or pick a different frame.
- Agent requests: `must` (places that have to appear), `skip` (e.g. ["library"]), `pick` (only these frames, matched on filename), `perPhoto`. Per-photo hand choices go in the run file as `steps: {photo: {ticks: [three names]}}`.
- A satellite overview (satmap/) is made only when asked: property pin + the requested places, labels never covering pins.

## 28 Oct 2026 — "Simple" template (Jason)
- New pin style `simple` in the editor (Template list → "Simple"): dark rounded labels reading "Name - 1.5km", a thin white line straight down to the spot, hollow white house pin with the street address above it. Based on a realestate.com.au listing Jason liked.
- Use it only when Jason or the agent asks (set `"agency": "simple"` on the job). Agency branding still wins by default.
- Simple template takes more pins: thin lines may pass near other labels (only real overlaps count). Jenny Fry (City to Surf, jenny@citytosurf.net.au) likes lots of pins: Simple, 5 per photo, no library.

## 29 Oct 2026 — top-down in the same set + quick check (Jason)
- mkday.py publishes ONE editor job per address: top-down first (kept full frame via index `fullPhotos`), then the aerials. No more separate "— top-down" entries.
- Gallery section shows the top-down first and a "Quick check" panel (check.html): lot boundary on satellite + every pinned place on a map with distances, for the VA to eyeball.

## 29 Oct 2026
- **Two top-downs**: `prep_day.py` keeps a second nadir when yaw differs >25° or altitude >8 m — but check it isn't a near-duplicate (Coulthard 0880/0881 and St Kilda 0900/0902 were; dropped). DJI Fly files can carry EXIF orientation 8: register against the raw pixels (tag stripped), not the rotated view.
- **Oblique location map** (Jenny/City to Surf style, asked for 47 Attra St): `oblique.py maps/obl_<slug>.json out.jpg`. Satellite mosaics z17/z16/z15/z13 come from the Mac browser (`box()` helper → `__chunk` → `assemble.py`). `style: "elegant"` = frosted label cards with distances, slim white pin, address bottom-left, Perth CBD chip. Jason rejected the bold red/white version as "cheap". Min 6 places.
- **Fence accuracy**: `ruler_pub.py <day> <slug> <photo>` makes edge-ruler crops from the *published* project.json; an independent agent reads offsets → `fence_apply.py result.json` builds pixel-polygon (`pxpoly`) re-render jobs; low-confidence edges are not moved.
- **No logo on top-downs** (Jason, 29 Oct).
- **Maps in the editor** (Jason, 29 Oct): satellite and location maps must also open in /pins. Give the clean map image a virtual DJI camera with `tagcam.py in.jpg cam.json out.jpg` (satellite: nadir cam fitted from known pin pixels; oblique: the oblique.py camera, `style: "none"` base), run them through t12 as `<slug>__maps`, then add the photo entries to the job's src/project.json and to index photos + fullPhotos. The gallery keeps the finished map images.
- **Lot area rule** (29 Oct, after 47 Attra showed 809 m² instead of 812): a typed `area` is only used with an `areaSource` (title, strata plan, agent sketch). Without one, t12 uses the Landgate cadastre area and logs it to AREA_FLAGS.txt. Note the source whenever you type an area.
- **Editor map panel + centred top-downs** (29 Oct): gallery jobs open with a Map & boundary panel (check.html; rebuild all with gen_check.py). Top-down crops shrink to stay centred on the lot (never tighter than lot+labels).
- **Sky always replaced on daytime shoots** (Jason, 29 Oct, after 22/337 Lord St went out with a white overcast sky): `noSky` is for real twilight/sunset shoots only. If the plate ghosts a skyline, fix the mask; don't keep the grey sky. `resky.js <day> <slug>` re-exports a published job with the sky on.
- **Belle Property** (belleproperty.com → green-belle, Jason 29 Oct, ref: 6/33 Malcolm St West Perth listing): green teardrop pins, white label cards, belle logo house pin.
  Belle jobs also get sky plate D (Belle blue, puffy cumulus) and 2 pins per photo (prep_day default; picking green-belle in the editor switches the sky).
- **Street at the bottom** (Jason, 29 Oct): every top-down must have the street at the bottom. Look at each nadir and set `streetRot: {"<slug>__nadir": 90|180|270}` (clockwise) in the day file; prep_day turns the photo and the camera yaw. Corner lots: the street the house faces. 90 Tibradden fixed by hand.
