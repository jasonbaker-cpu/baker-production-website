/* Baker Production shooting standard: content file.
   SHOOTERS: names shown in the self-check dropdown and the scoreboard.
   REVIEWS: newest first. Add a block at the top when Jason says to post a shooter review.
     kind: "bad" = fix next time, "good" = keep doing this. */

window.UPDATED = "6 Nov 2026";

window.SHOOTERS = ["Jason", "Lee", "Yan", "Andrew"];

/* Minimum scenes (bracket sets) to shoot per package. Edit to suit. */
window.COVERAGE = { "Rental": 15, "Sales": 25, "Premium day": 30 };

window.GOOD = [
  { img: "img/good-thorburn-living.webp", job: "22 Thorburn Ave", file: "DSC09089", why: "Shot from the corner into the room. Two walls, the window and the flow to the hall all in one frame. Verticals straight." },
  { img: "img/good-thorburn-bedroom.webp", job: "22 Thorburn Ave", file: "DSC09125", why: "Bed, window and wardrobe wall in one shot. Camera at benchtop height, level, not looking down on the bed." },
  { img: "img/good-wattle-kitchen.webp", job: "1/32 Wattle St", file: "DSC09264", why: "Kitchen shot square-on from the meals area. Benchtop, splashback and appliances all visible. Verticals straight." },
  { img: "img/good-thorburn-front.webp", job: "22 Thorburn Ave", file: "DSC09185", why: "Front at an angle showing facade and driveway, camera level so the house doesn't lean." }
];

window.REVIEWS = [
  { date: "6 Nov 2026", shoot: "4 Nov", shooter: "Lee", job: "4 Camelot Grove, Carramar", score: 7.5,
    verdict: "Good coverage and level camera. Tighten the framing in small rooms, don't repeat the front angle, and set ISO 100-200.",
    notes: [
      { img: "img/reviews/camelot-09852.webp", file: "DSC09852", kind: "good", text: "Kitchen shot from the corner: benchtop, appliances and the flow to the family room in one frame. Three different kitchen angles. Keep doing this." },
      { img: "img/reviews/camelot-09889.webp", file: "DSC09889", kind: "good", text: "Wide hero of the family/meals area, camera level, verticals straight. Every interior on this job was level." },
      { img: "img/reviews/camelot-09825.webp", file: "DSC09825", kind: "bad", text: "Bathroom shot from the doorway: mostly wall and toilet, vanity cut off on the left. Step in and shoot from the corner so the vanity and shower are both in." },
      { img: "img/reviews/camelot-09908.webp", file: "DSC09908", kind: "bad", text: "Bedroom: half the bed cut off at the left edge. Shoot from the opposite corner so the whole bed and the window are in frame." },
      { img: "img/reviews/camelot-09797.webp", file: "DSC09797", kind: "bad", text: "Recliner fills the foreground. Camera too close to furniture; pull back or move the tripod so the room reads first. Same on DSC09802 (recliner cut at bottom left)." },
      { img: "img/reviews/camelot-09961-66.webp", file: "DSC09961 / DSC09966", kind: "bad", text: "Two fronts from almost the same spot, and the house sits in the top half with a big lawn below. Make the second one a different angle (3/4 from the driveway) and step closer so the house fills the frame." },
      { img: "img/reviews/camelot-09926.webp", file: "DSC09926", kind: "bad", text: "Rear patio pointed at the fence and bench in patchy tree shadow. Low-value frame. Shoot from the fence corner back toward the house and alfresco instead." },
      { img: "img/reviews/camelot-09931.webp", file: "DSC09931", kind: "bad", text: "Basketball hoop poking in at the top edge. Reframe so it's either fully in or fully out." },
      { file: "Camera settings (raws)", kind: "bad", text: "5 brackets over 8 stops at 16mm f/9: good. But ISO 640 on every frame. You're on a tripod, so set ISO 100-200 (turn Auto ISO off)." }
    ] }
];
