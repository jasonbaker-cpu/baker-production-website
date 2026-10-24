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
```
# days/<day-id>.json  — see prep_day.py docstring (slug, addr, who, agency, photos dir, map, poly, must)
echo '[{"slug":"<slug>","photos":[...jpgs...]}, ...]' > e2e/reg.json && python3 regall.py e2e/reg.json   # satellite line-up (skips jobs without sat)
python3 prep_day.py <day-id>
python3 runjobs.py e2e/run_<day-id>.json
```
`day-id` looks like `23-oct-2026`.

## 5. Check (always)
1. For each top-down: `python3 edgeruler.py <slug>__nadir`.
2. Have an independent subagent read the `qc/er_*` strips and return the fence offset per edge, in JSON.
3. Put any edge more than 0.3 m off into `edgeOff` in `days/<day-id>.json`. Re-run prep_day and that `__nadir` job.
4. Make contact sheets and look at every photo yourself, plus an independent subagent QC of the horizon band.
5. Fix or flag:
   - wrong agency pin style
   - pins clipped or overlapping
   - halo, fog or ghosting at the horizon
   - lot area different from the title

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
