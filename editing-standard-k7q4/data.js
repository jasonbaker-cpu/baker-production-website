/* Baker Production editing standard: content file.
   To add an example: copy one line in GOOD, BAD or BEFORE_AFTER and change it.
   Put new images in the img/ folder next to this file (webp or jpg, ~1600px wide). */

window.UPDATED = "6 Nov 2026, 8am";


/* EDITOR TOOLS: links the editors use every day. */
window.EDITOR_TOOLS = [
  { title: "Baker Aerial Editor (drone pins, boundaries, top-downs)", url: "https://www.bakerproduction.com/pins/", note: "Upload your finished drone photos here and press Send to Baker. Pins and lot lines go on automatically. Keep the original DJI file names." },
  { title: "Drone hand-back guide (step by step)", url: "https://www.bakerproduction.com/pins/guide/", note: "How to hand back drone jobs: sky, colour and horizon only. No pins, text, logos or crops from you." },
  { title: "Twilight skies: Perth dusk picks", url: "https://www.dropbox.com/scl/fo/kgzj8n98zt88pgv72t5re/AP6keDaxyRoggOF3DMujKJc?rlkey=rdeglkgv259msx2f3rxq3i4ka&dl=0", note: "Use these on twilight fronts. Natural sunset look, soft pink/purple OK, no dark fake purple. Use a different sky per job." },
  { title: "Full written editing standard", url: "https://www.bakerproduction.com/pins/edit-standard-7k3q/", note: "Longer version of these rules, with scores against Crib Creative." }
];

window.REFERENCE_LINKS = [
  { title: "OUR STANDARD: 22 Thorburn Ave, Beechboro (Profocus, 8.5/10)", url: "https://www.dropbox.com/scl/fo/8c0ebpas05y2lo4jkxvl1/AEr14Z7un1FXvkFu-Ve2EaY?rlkey=y81vsut2bd30kervze8vkjpg2&dl=0", note: "Match this on every interior job. May be removed from Dropbox after delivery." },
  { title: "Crib Creative: 9B Moldavia St, Tuart Hill (day + twilight)", url: "https://holdsworth.com.au/property/sales/9b-moldavia-street-tuart-hill-wa/", note: "The look we are chasing. Warm white walls, bright, soft shadows." },
  { title: "Crib Creative: 269A Cape St, Yokine (twilight)", url: "https://holdsworth.com.au/property/sales/269a-cape-street-yokine-wa/", note: "Twilight reference." }];

window.GOOD = [
  { img: "img/good-thorburn-living.webp", job: "22 Thorburn Ave", file: "DSC09089", why: "Warm white walls, bright but not blown, windows pulled clean." },
  { img: "img/good-thorburn-kitchen.webp", job: "22 Thorburn Ave", file: "DSC09105", why: "Clean whites, true cabinet colour, straight verticals." },
  { img: "img/good-thorburn-bedroom.webp", job: "22 Thorburn Ave", file: "DSC09125", why: "Even light across the room, no grey cast." },
  { img: "img/good-thorburn-front.webp", job: "22 Thorburn Ave", file: "DSC09185", why: "Soft pale blue sky, natural grass, bright facade." },
  { img: "img/good-wattle-living.webp", job: "1/32 Wattle St", file: "DSC09241", why: "Bright, airy, consistent with the rest of the set." },
  { img: "img/good-wattle-kitchen.webp", job: "1/32 Wattle St", file: "DSC09264", why: "Crisp whites, window view kept." },
  { img: "img/good-hermitage-dusk-rear.webp", job: "29 Hermitage Dr", file: "DSC08256", why: "Natural sunset twilight: soft pink clouds, lights on, not fake purple." },
  { img: "img/good-hermitage-dusk-front.webp", job: "29 Hermitage Dr", file: "DSC08301", why: "Warm lights, soft sky, garden lighting visible." },
  { img: "img/good-drone-location.webp", job: "19 Joondanna Dr", file: "drone 0985", why: "3 pins, same small size, labels not covering pins, property clearly marked." },
  { img: "img/good-drone-topdown-side.webp", job: "19 Joondanna Dr", file: "drone 0982", why: "Top-down with road on the side: bold white lot size with ², blur outside the lot. (Also need one with the road at the bottom.)" }
];

window.BAD = [
  { img: "img/bad-joondanna-orange.webp", job: "19 Joondanna Dr", file: "DSC03626", why: "Orange/peach cast on ceiling and walls. Ceilings must read white." },
  { img: "img/bad-dover-grey-dark.webp", job: "2/10 Dover Rd", file: "DSC03513", why: "Cold grey walls with no warmth. Walls should be warm white like Thorburn." },
  { img: "img/bad-jay-too-bright.webp", job: "7 Jay Ct", file: "DSC04067", why: "Too bright. Walls washed out to pure white, ceiling nearly blown. Pull back to Thorburn level." },
  { img: "img/bad-mills-orange-floor.webp", job: "1 Mills Ave", file: "DSC03787", why: "Floorboards too orange/saturated. Keep timber natural." },
  { img: "img/bad-caledonian-deep-sky.webp", job: "42/86 Caledonian Ave", file: "DSC09760-1", why: "Day sky too deep/dark blue. Use soft pale blue." },
  { img: "img/bad-caledonian-harsh-garden.webp", job: "42/86 Caledonian Ave", file: "DSC09780", why: "Harsh single exposure, heavy black shadows under the tree. Blend and lift shadows." },
  { img: "img/bad-titanium-unedited-topdown.webp", job: "17 Titanium Blvd", file: "drone 0966", why: "Top-down not edited: no lot boundary, no lot size, no blur outside the lot." }
];

window.BEFORE_AFTER = [
  { before: "img/ba-hyams-before.webp", after: "img/ba-hyams-after.webp", job: "32 Hyams Lane", file: "DSC03316", why: "Before: grey and dim. After: brightened to match the set. This is the fix we want." },
  { before: "img/ba-hermitage-before.webp", after: "img/ba-hermitage-after.webp", job: "29 Hermitage Dr", file: "DSC08098", why: "Before: walls dull. After: lifted to Crib level without losing the warm tone." }
];

/* JOB REVIEWS: newest first. Add a new block at the top when Jason says to post a review.
   kind: "bad" = needs fixing, "good" = example of what was right. drop = duplicate files to remove. */
window.REVIEWS = [
  { date: "5 Nov 2026 (redelivery)", shoot: "4 Nov", job: "42/86 Caledonian Ave, Maylands", score: 7, verdict: "NOT REDONE. Every file is identical to the first delivery. Full redo needed.",
    notes: [ { img: "img/reviews/caledonian-09760.webp", file: "DSC09760-1 (+ all exteriors)", kind: "bad", text: "Day sky deep blue on every exterior. Use soft pale blue." },
             { img: "img/reviews/caledonian-09780.webp", file: "DSC09780", kind: "bad", text: "Harsh single exposure, black shadows under the tree. Blend and lift." },
             { img: "img/reviews/caledonian-09730.webp", file: "DSC09730", kind: "bad", text: "Bathroom walls yellow/cream. Neutralise." },
             { img: "img/reviews/caledonian-drone-0073.webp", file: "DJI_0073", kind: "bad", text: "Only 2 pins. Every location shot needs 3. Also: no top-downs delivered (need 2: road at bottom + road on side)." } ],
    drop: ["DJI_0071"] },
  { date: "5 Nov 2026 (redelivery)", shoot: "4 Nov", job: "7 Jay Ct, Huntingdale", score: 8, verdict: "Interiors fixed (walls 222 to 212). Alfresco not touched, still grey.",
    notes: [ { img: "img/reviews/jay-04040-v2.webp", file: "DSC04040", kind: "good", text: "Redo: walls 231 to 211, ceiling detail back. This is right." },
             { img: "img/reviews/jay-04123.webp", file: "DSC04123-04138", kind: "bad", text: "Alfresco still grey and darker than the warm interiors. Match the set." } ],
    drop: ["DSC04051", "DSC04023", "DSC04079", "DSC04133", "DSC04183"] },
  { date: "5 Nov 2026 (redelivery)", shoot: "4 Nov", job: "1 Numbat Ct, Brookdale", score: 8.5, verdict: "Fixed. Brightness back to Crib level, patio shots now match.",
    notes: [ { img: "img/reviews/numbat-03804-v2.webp", file: "DSC03804", kind: "bad", text: "Still the brightest frame (walls 222). Pull back slightly (also 03833)." },
             { img: "img/reviews/numbat-03902.webp", file: "DSC03892-03927", kind: "good", text: "Patio frames now one consistent grade." } ],
    drop: ["DSC03762", "DSC03767"] },
  { date: "5 Nov 2026 (redelivery)", shoot: "4 Nov", job: "32 Ionesco St, Spearwood", score: 8.5, verdict: "Fixed. Overexposure and blown floors sorted. One bedroom still hot.",
    notes: [ { img: "img/reviews/ionesco-04185-v2.webp", file: "DSC04185", kind: "bad", text: "Still too bright (walls 229). Bring down to ~212 like the rest (also 04179 a touch)." },
             { img: "img/reviews/ionesco-04337.webp", file: "DSC04337", kind: "good", text: "Redo: sunlit floor recovered (clipping 3% to 1%)." } ],
    drop: ["DSC04216", "DSC04228", "DSC04267", "DSC04363"] },
  { date: "5 Nov 2026 (redelivery)", shoot: "4 Nov", job: "11 Denton St, Aveley", score: 8.5, verdict: "3 of 4 hot walls fixed. Duplicates were re-edited instead of removed.",
    notes: [ { img: "img/reviews/denton-09971.webp", file: "DSC09971", kind: "bad", text: "Not touched: walls still 228. Bring down to ~212." } ],
    drop: ["DSC00089", "DSC00158"] },
  { date: "5 Nov 2026 (redelivery)", shoot: "4 Nov", job: "51 Ashburton Dr, Gosnells", score: 8, verdict: "Walls fixed (221 to 208). Yard shot still a bit heavy.",
    notes: [ { img: "img/reviews/ashburton-04208-v2.webp", file: "DSC04208", kind: "good", text: "Redo: walls 227 to 210. Right level." },
             { img: "img/reviews/ashburton-04367.webp", file: "DSC04367", kind: "bad", text: "Ground under the tree still heavy. Lift shadows more." } ],
    drop: ["DSC04299", "DSC04287", "DSC04412"] },
  { date: "5 Nov 2026", shoot: "4 Nov", job: "23 Riding Way, Bull Creek", score: 8.5, verdict: "Pass. One of the best sets this week.",
    notes: [ { img: "img/reviews/riding-08441.webp", file: "DSC08441", kind: "good", text: "Walls 210, warm, bright, natural timber beams. This is the level." },
             { img: "img/reviews/riding-08491.webp", file: "DSC08491", kind: "good", text: "Consistent with the rest of the set, windows pulled." } ],
    drop: [] },
  { date: "5 Nov 2026", shoot: "4 Nov", job: "4 Camelot Grove, Carramar", score: 8.5, verdict: "Pass. Closest to Crib this week.",
    notes: [ { img: "img/reviews/camelot-09785.webp", file: "DSC09785", kind: "good", text: "Warm white, bright, consistent. This is the level." },
             { img: "img/reviews/camelot-09961.webp", file: "DSC09961", kind: "good", text: "Soft pale sky, clean facade." } ],
    drop: [] },
  { date: "5 Nov 2026", shoot: "4 Nov", job: "51 Hepburn Way, Balga", score: 8, verdict: "Pass.",
    notes: [ { img: "img/reviews/hepburn-04432.webp", file: "DSC04432", kind: "good", text: "Bright and airy. Yellow lower glass is real textured glass, fine." } ],
    drop: [] }
];

/* PREMIUM DAY PHOTOGRAPHY: premium tier only. Standard jobs follow the normal rules above. */
window.PREMIUM_LINKS = [
  { title: "OUR PREMIUM STANDARD: 4 McGlew Rd, Glen Forrest (full set)", url: "https://www.dropbox.com/scl/fo/yoef1ay7o09n9zn1dvjz2/AOCl-GQjWYJP7Ie6ujobAwQ?rlkey=mrk99kwbx9jfk87en1qwqzk6x&dl=0", note: "Match this on every premium job. May be removed from Dropbox after delivery." },
  { title: "Brightness target: 91 St Leonards Ave, West Leederville", url: "https://www.domain.com.au/91-st-leonards-avenue-west-leederville-wa-6007-2021224490", note: "Natural light, bright overall, soft falloff. Aim for this brightness." }
];
window.PREMIUM = [
  { img: "img/premium/westperth-living.webp", job: "West Perth", file: "Living", why: "Window view held, soft natural light, bright with real shadows. No flash look." },
  { img: "img/premium/westperth-kitchen.webp", job: "West Perth", file: "Kitchen", why: "Cream whites, true black splashback, light falls off naturally from the window." },
  { img: "img/premium/westperth-bathroom.webp", job: "West Perth", file: "Bathroom", why: "Clean warm-neutral whites, black tiles stay black, not grey." },
  { img: "img/premium/wandi-openplan.webp", job: "Wandi", file: "Open plan", why: "Sunlight on the floor kept, room bright end to end, no dark corners." },
  { img: "img/premium/wandi-kitchen.webp", job: "Wandi", file: "Kitchen", why: "Bright white joinery, natural timber, gentle shadow depth." },
  { img: "img/premium/highgate-living.webp", job: "Highgate", file: "Living", why: "Soft window light, warm tone, nothing blown." },
  { img: "img/premium/highgate-bedroom.webp", job: "Highgate", file: "Bedroom", why: "Sheer curtains glowing softly, warm white walls, calm and even." },
  { img: "img/premium/beeliar-dining.webp", job: "Beeliar", file: "Dining / fireplace", why: "Fire kept warm, brick true colour, windows pulled." },
  { img: "img/premium/glenforrest-kitchen.webp", job: "4 McGlew Rd, Glen Forrest", file: "Kitchen / dining", why: "Benchmark job. Natural daylight mood, timber and brick true to life." },
  { img: "img/premium/glenforrest-veranda.webp", job: "4 McGlew Rd, Glen Forrest", file: "Veranda / facade", why: "Soft pale sky, garden colour natural, shadows lifted under the veranda." },
  { img: "img/premium/madeley-facade.webp", job: "Madeley", file: "Facade", why: "Pale blue sky, natural grass, bright clean facade." }
];
