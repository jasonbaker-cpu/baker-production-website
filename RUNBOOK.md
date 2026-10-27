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
  - listing agent and their email domain → pin style via `agency_map.json`. If the domain isn't listed, use `red` and flag it.
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
- No `*_map.html`: build `batch/<slug>/<slug>_places.json` from TomTom using the format below. Pick 8–14 real amenities: schools, shopping centres, stations, beaches, parks, golf. Skip childcare businesses, driving schools and dance studios.
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
   add it to the map, and note it in the report. Century 21 = Obsessed Grey pins + Relentless Gold house pin (`c21`).
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
