/* Baker Production editing standard: content file.
   To add an example: copy one line in GOOD, BAD or BEFORE_AFTER and change it.
   Put new images in the img/ folder next to this file (webp or jpg, ~1600px wide). */

window.UPDATED = "5 Nov 2026, 10:30am";

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

/* JOB REVIEWS: newest first. Add a new block at the top of the list when Jason says to post a review.
   kind: "bad" = needs fixing, "good" = example of what was right. drop = duplicate files to remove. */
window.REVIEWS = [
  { date: "5 Nov 2026", shoot: "4 Nov", job: "4 Camelot Grove, Carramar", score: 8.5, verdict: "Pass. Closest to Crib this week.",
    notes: [ { img: "img/reviews/camelot-09785.webp", file: "DSC09785", kind: "good", text: "Warm white, bright, consistent. This is the level." },
             { img: "img/reviews/camelot-09961.webp", file: "DSC09961", kind: "good", text: "Soft pale sky, clean facade." } ],
    drop: [] },
  { date: "5 Nov 2026", shoot: "4 Nov", job: "51 Hepburn Way, Balga", score: 8, verdict: "Pass.",
    notes: [ { img: "img/reviews/hepburn-04432.webp", file: "DSC04432", kind: "good", text: "Bright and airy. Yellow lower glass is real textured glass, fine." } ],
    drop: [] },
  { date: "5 Nov 2026", shoot: "4 Nov", job: "11 Denton St, Aveley", score: 8, verdict: "Pass. Minor: a few walls slightly too white.",
    notes: [ { img: "img/reviews/denton-09999.webp", file: "DSC09999", kind: "bad", text: "Walls a touch hot (also 00010, 09971, 00005). Pull back slightly." } ],
    drop: ["DSC00089", "DSC00158"] },
  { date: "5 Nov 2026", shoot: "4 Nov", job: "7 Jay Ct, Huntingdale", score: 7.5, verdict: "Too bright overall.",
    notes: [ { img: "img/reviews/jay-04067.webp", file: "DSC04067", kind: "bad", text: "Walls washed out to pure white, ceiling nearly blown. Pull back to Thorburn level." },
             { img: "img/reviews/jay-04123.webp", file: "DSC04123", kind: "bad", text: "Alfresco grey and darker than the warm interiors. Match the set." } ],
    drop: ["DSC04051", "DSC04023", "DSC04079", "DSC04133", "DSC04183"] },
  { date: "5 Nov 2026", shoot: "4 Nov", job: "1 Numbat Ct, Brookdale", score: 7.5, verdict: "Too bright and flat.",
    notes: [ { img: "img/reviews/numbat-03804.webp", file: "DSC03804", kind: "bad", text: "Over-bright, whites look flat. Bring walls back to ~Thorburn." },
             { img: "img/reviews/numbat-03902.webp", file: "DSC03902", kind: "bad", text: "Patio cream/warm while DSC03892 is grey. Patio shots must match each other." } ],
    drop: ["DSC03762", "DSC03767"] },
  { date: "5 Nov 2026", shoot: "4 Nov", job: "51 Ashburton Dr, Gosnells", score: 7.5, verdict: "Walls too white, yard too dark.",
    notes: [ { img: "img/reviews/ashburton-04214.webp", file: "DSC04214", kind: "bad", text: "Walls too white/clinical (also 04232, 04208)." },
             { img: "img/reviews/ashburton-04367.webp", file: "DSC04367", kind: "bad", text: "Back yard under tree heavy and dark (also 04377). Lift shadows." } ],
    drop: ["DSC04299", "DSC04287", "DSC04412"] },
  { date: "5 Nov 2026", shoot: "4 Nov", job: "32 Ionesco St, Spearwood", score: 7.5, verdict: "Overexposed, slightly cream.",
    notes: [ { img: "img/reviews/ionesco-04174.webp", file: "DSC04174", kind: "bad", text: "Overexposed (also 04185, 04212). Pull back and neutralise the cream." },
             { img: "img/reviews/ionesco-04337.webp", file: "DSC04337", kind: "bad", text: "Sunlit floor patches blown out (also 04343). Recover highlights." } ],
    drop: ["DSC04228", "DSC04267", "DSC04216", "DSC04363"] },
  { date: "5 Nov 2026", shoot: "4 Nov", job: "42/86 Caledonian Ave, Maylands", score: 7, verdict: "Send back: skies, garden shot, bathroom, drone pins.",
    notes: [ { img: "img/reviews/caledonian-09760.webp", file: "DSC09760-1", kind: "bad", text: "Day sky deep blue on every exterior. Use soft pale blue." },
             { img: "img/reviews/caledonian-09780.webp", file: "DSC09780", kind: "bad", text: "Harsh single exposure, black shadows under the tree. Blend and lift." },
             { img: "img/reviews/caledonian-09730.webp", file: "DSC09730", kind: "bad", text: "Bathroom walls yellow/cream. Neutralise." },
             { img: "img/reviews/caledonian-drone-0073.webp", file: "DJI_0073", kind: "bad", text: "Only 2 pins. Every location shot needs 3." } ],
    drop: ["DJI_0071"] }
];
