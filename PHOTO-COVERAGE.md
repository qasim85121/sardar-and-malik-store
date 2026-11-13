# Product photo coverage — Sardar And Malik Store (deploy package)

## Coverage (original 298-product catalogue)
- **272 of 298 products** have their own verified real Markaz photo
  (local files in `public/photos/<id>.jpg`, wired via the `image` field in
  `data/products.json`). The storefront shows the photo; the category emoji
  tile remains behind it as a fallback if an image fails to load.
- **26 of 298 products** still show the category emoji tile only — no
  verified Markaz photo could be found for them after exhaustive searching
  (see below). No wrong or lookalike photo was attached to any product.

## Note: the catalogue has since grown (catalogue-expansion work)
- `data/products.json` now holds **14,236 products**. The 13,938 added
  products carry remote Markaz thumbnail URLs as their `image` value
  (all on `static.markaz.app`, hotlinked — not downloaded locally, and
  **not visually verified by this photo work**; a random sample of 20
  returned HTTP 200 with an image content type). The original 272 local
  photos and the 26 imageless products below are unchanged by that
  expansion.

## How the photos were sourced
- Only Markaz's own public media (`static.markaz.app` URLs). Two methods:
  1. Image search, keeping only `static.markaz.app` results.
  2. Markaz product pages' own `og:image` / `twitter:image`, and Markaz's
     own search APIs (`www.markaz.app/api/marketplace/search/anon` and
     `/api/china/search`), which return full `static.markaz.app` media lists.
- Every photo was downloaded locally (no hotlinking), converted to JPEG,
  and visually checked against its product name before being accepted.
- No source URL or photo file is reused for two different products
  (verified: 272 unique file hashes, 0 duplicate source URLs across the
  surviving mapping records).

## Products still without a real Markaz photo (26)
| ID | Product | Reason no verified photo exists |
|----|---------|---------------------------------|
| 57 | Non-Stick Cookware Set 7 Piece | Only 3-pc aluminium wok/saucepan sets and utensil sets found |
| 59 | Spice Box with 7 Containers | Closest is a 4-compartment box; 6-pc sets also wrong count |
| 61 | Dinner Set 32 Piece — Melamine | Only melamine bowls/trays and disposable paper plate sets |
| 72 | LED Bulb Pack of 4 — 12W | Closest is a 5-pack 12V bulb; count and wattage don't match |
| 73 | Door Lock Set — Steel | Only bike/drawer/fridge locks, stoppers, one smart glass lock |
| 74 | Extension Board 4 Socket | No extension board at all; only tool socket sets and USB hubs |
| 102 | Tasbeeh 99 Beads — Wooden | Only digital counters, 108-bead bracelets, 99-bead glass bracelets |
| 106 | Quran Pak with Tajweed — Hard Cover | Only books about the Quran and a "Mushaf" novel; no physical Quran Pak |
| 123 | Geometry Box Set | Only geometry-themed slippers/watches and teaching aids |
| 124 | Hard Cover Register — 200 Pages | Closest is an Urdu khata ledger whose photo is an inside-pages spec graphic, page count unverified |
| 148 | Trolley Bag Medium 24 inch | Only duffels and small trolley-handle totes, no size/wheels |
| 151 | Table Cover — Plastic Printed | Only plastic printed dastarkhwan (floor sheets) and lace tablecloths |
| 154 | Face Towel Pack of 12 | Face towels exist singly/small sets only; no 12-pack |
| 158 | Car Back Seat Organizer | Only seat cushions/pillows and a Haval cup holder |
| 163 | Dumbbell Pair 2kg | Only a dumbbell bracelet and hip-thrust belts |
| 165 | Push Up Board Set | Only push-up bras, every wording/page |
| 177 | Foldable Shopping Trolley | Only shopping bags and kitchen storage trolleys |
| 217 | Air Fryer 4.5L — Digital | Only accessories (liners, trays, spray bottles), not the fryer |
| 240 | Kids Sherwani Set | No sherwani anywhere; closest is a boys' coat suit (different garment) |
| 251 | Baby Stroller — Foldable | Only toy ride-on cars and stroller accessories |
| 252 | Baby Bath Tub | Closest is an inflatable kids' pool |
| 253 | Kids Feeding Chair | Closest is a baby walker with a "feeding chair option" |
| 270 | Bakhoor Incense Set | Only Al Bakhoor perfumes and a generic incense-burner bowl |
| 288 | Ankle Weights Pair 1kg | Only ankle braces/straps |
| 289 | Foam Roller — Muscle Relax | Only foot/facial rollers and a knee brace |
| 293 | Table Fan 12 inch | Only mini USB/handheld/neck fans |

## Known imperfect-but-accepted matches (visually the right product)
- 20 Co-Ord Set: mustard solid top + printed palazzo (no fully solid set found).
- 111 Baby Wipes Pack of 3: photo shows a single pack, not a visible pack of 3.
- 135 Attar gift set photographed in smoke.
- 218 Glass Storage Jars Set of 6: photo shows 4 jars.
- 219 Non-Stick Tawa: listing calls it a "cast iron pancake pan"; visually a flat tawa griddle.
- 246 Scented Candle Set of 3: photo shows many bubble candles (no true 3-pack on Markaz).
- 281 Dining Table Runner: Christmas/snowman-themed (only embroidered dining runner found).
- A few photos carry small seller codes/brand tags or normal Markaz listing
  text overlays that are part of the original Markaz product photo.
- 157 Bike Gloves: winter/ski-style glove pair (gloves, not bike-specific).
- 284 Bike Rain Coat Set: carries a "RAIN SUIT / Discount Up To 50% Off / SHOP NOW" promo banner.
- 231 Mattress Protector: listing collage, clean main panel with small Chinese text in a sub-panel.
- 229 Fitted Sheet: small "Plain Strip Fitted Sheet" label.
- 260 Water Colour Set: search index mislabels its source URL as a lipstick palette; re-fetching the URL returns the Marie's watercolour palette image.

## Sourcing records
Per-group mappings (persistent copies; the originals for groups 1, 4 and 5
were lost when the VM's /tmp was wiped mid-task — the photo files
themselves were never at risk and were verified at download time):
- `~/workspace/photo-work/group2-mapping.json`, `group3-mapping.json`,
  `round2a-mapping.json`, `round2b-mapping.json`
- Group 1, 4 and 5 done-id lists are recoverable from the photo files in
  `public/photos/` (272 files, all verified).
