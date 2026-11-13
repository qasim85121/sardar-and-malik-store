// Generates 4-5 gender-matched starter reviews per product, in the same style
// as the live store (Pakistani names, Pakistani cities, Roman Urdu, rating 4-5).
// Gender is decided from the product category and name:
//   men's items -> men's names/wording, women's items -> women's, everything
//   else -> a mix. Names are never repeated within one product.
const fs = require("fs");
const path = require("path");

const MALE_NAMES = [
  "Shahid Hussain", "Kashif Akhtar", "Noman Mehmood", "Imran Sharif", "Asif Arain",
  "Bilal Ahmed", "Usman Ghani", "Ahmed Raza", "Hassan Ali", "Ali Nawaz",
  "Zubair Khan", "Faisal Iqbal", "Tariq Aziz", "Waqas Ahmed", "Sajid Ali",
  "Rashid Mehmood", "Adil Hussain", "Hamza Tariq", "Danish Ali", "Saad Khan",
  "Umar Farooq", "Junaid Akhtar", "Arslan Haider", "Mudassar Iqbal", "Shahzad Anwar",
  "Naveed Ahmed", "Adeel Raza", "Fahad Malik", "Talha Siddiqui", "Yasir Hussain",
  "Ahsan Iqbal", "Mohsin Raza", "Salman Ahmed", "Zeeshan Ali", "Farhan Khan",
  "Rehan Ahmed", "Owais Akhtar", "Haseeb Ullah", "Shahbaz Ali", "Nabeel Ahmed",
  "Irfan Haider", "Khurram Shahzad", "Aamir Sohail", "Tauqeer Ahmed", "Waseem Akhtar",
  "Abdul Basit", "Mansoor Ali", "Shafiq Ahmed", "Rizwan Haider", "Sohail Akhtar"
];

const FEMALE_NAMES = [
  "Fatima Khan", "Ayesha Iqbal", "Zainab Bhatti", "Maryam Hashmi", "Iqra Baig",
  "Hira Malik", "Sana Tariq", "Mahnoor Akhtar", "Amna Raza", "Kiran Shahid",
  "Rabia Anwar", "Nadia Hussain", "Sadia Ahmed", "Bushra Khan", "Farah Iqbal",
  "Shazia Malik", "Noreen Akhtar", "Samina Raza", "Tahira Bibi", "Gulnaz Ahmed",
  "Mehwish Khan", "Saba Tariq", "Uzma Hussain", "Asma Raza", "Shumaila Akhtar",
  "Rukhsana Bibi", "Naila Ahmed", "Saima Khan", "Anam Tariq", "Hina Malik",
  "Zara Ahmed", "Laiba Hussain", "Alishba Raza", "Eman Khan", "Areeba Akhtar",
  "Noor Fatima", "Marium Siddiqui", "Sidra Ahmed", "Warda Khan", "Aleena Tariq",
  "Sania Hussain", "Fiza Malik", "Komal Raza", "Nimra Ahmed", "Amina Khan",
  "Tehreem Akhtar", "Yusra Hussain", "Hafsa Tariq", "Arooj Malik", "Sumbal Ahmed"
];

const CITIES = [
  "Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan",
  "Peshawar", "Quetta", "Sialkot", "Gujranwala", "Hyderabad", "Bahawalpur",
  "Sargodha", "Abbottabad", "Mardan", "Sukkur", "Larkana", "Jhelum", "Gujrat",
  "Sheikhupura"
];

const MALE_TEXTS = [
  "Quality umeed se zyada achi nikli, shukriya Sardar And Malik Store. Main regular customer ban gaya hun.",
  "Delivery time par ho gayi aur packing bhi boht achi thi. Hum larkon ke liye perfect hai.",
  "Material boht acha hai, lagta hai dair tak chalega. Hum larkon ke liye zabardast hai.",
  "Pehli dafa online order kiya tha, experience boht acha raha. Main dobara karunga.",
  "Cheez original aur quality zabardast hai, paisay wasool! Main boht khush hun.",
  "Price ke hisaab se best product hai, main dobara zaroor order karunga.",
  "Packing itni achi thi ke cheez bilkul safe pohanchi, main mutmain hun.",
  "Doston ko bhi recommend karunga, sab ne tareef ki hai."
];

const FEMALE_TEXTS = [
  "Cheez original aur quality zabardast hai, paisay wasool! Main boht khush hun.",
  "Meri ammi ko bhi boht pasand aaya, unke liye bhi dobara order karungi.",
  "Customer service ne call par achi tarah guide kiya, main mutmain hun.",
  "Price ke hisaab se best product hai, main dobara zaroor order karungi.",
  "Packing itni achi thi ke cheez bilkul safe pohanchi, main mutmain hun.",
  "Quality boht achi hai, saheliyon ko bhi recommend karungi.",
  "Delivery time par ho gayi, cheez bilkul photo jaisi nikli. Hum larkiyon ke liye perfect hai.",
  "Boht pyari cheez hai, ghar walon ko bhi pasand aayi."
];

const MIXED_TEXTS = [
  "Cheez original aur quality zabardast hai, paisay wasool! Main boht khush hun.",
  "Delivery time par ho gayi aur packing bhi boht achi thi.",
  "Price ke hisaab se best product hai, main dobara zaroor order karunga.",
  "Quality umeed se zyada achi nikli, shukriya Sardar And Malik Store.",
  "Packing itni achi thi ke cheez bilkul safe pohanchi, main mutmain hun.",
  "Ghar walon ko bhi boht pasand aaya, dobara order karunga.",
  "Customer service ne achi tarah guide kiya, main mutmain hun.",
  "Boht achi cheez hai, sab ko recommend karunga."
];

// Categories that are clearly men's, women's, or mixed.
const MALE_CATEGORIES = new Set(["Men's Stitched", "Men's Unstitched", "Auto & Bike Accessories", "Shawls"]);
const FEMALE_CATEGORIES = new Set([
  "Cosmetics", "Women's Stitched", "Women's Unstitched",
  "Women's Handbags", "Jewellery", "Mother & Baby"
]);

function genderOf(p) {
  const name = p.name.toLowerCase();
  if (MALE_CATEGORIES.has(p.category)) return "male";
  if (FEMALE_CATEGORIES.has(p.category)) return "female";
  if (/men'?s|boys?|bike|helmet|gents|kurta|shalwar|waistcoat/.test(name)) return "male";
  if (/women'?s|girls?|lipstick|necklace|jhumka|handbag|frock|abaya|hijab|makeup|mehndi/.test(name)) return "female";
  return "mixed";
}

// Deterministic pseudo-random pick so seeding is stable across runs.
function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function generateReviews(products) {
  const reviews = [];
  let id = 1;
  for (const p of products) {
    const gender = genderOf(p);
    const rand = seededRandom(p.id * 7919 + 13);
    const count = 4 + Math.floor(rand() * 2); // 4 or 5
    const texts = gender === "male" ? MALE_TEXTS : gender === "female" ? FEMALE_TEXTS : MIXED_TEXTS;
    const names = gender === "male" ? MALE_NAMES : gender === "female" ? FEMALE_NAMES : [...MALE_NAMES, ...FEMALE_NAMES];
    // Pick distinct names and texts for this product.
    const nameIdx = new Set();
    const textIdx = new Set();
    const usedCities = new Set();
    for (let i = 0; i < count; i++) {
      let ni; do { ni = Math.floor(rand() * names.length); } while (nameIdx.has(ni));
      nameIdx.add(ni);
      let ti; do { ti = Math.floor(rand() * texts.length); } while (textIdx.has(ti));
      textIdx.add(ti);
      let ci; do { ci = Math.floor(rand() * CITIES.length); } while (usedCities.has(ci));
      usedCities.add(ci);
      reviews.push({
        id: id++,
        productId: p.id,
        reviewerName: names[ni],
        city: CITIES[ci],
        rating: rand() < 0.8 ? 5 : 4,
        reviewText: texts[ti]
      });
    }
  }
  return reviews;
}

if (require.main === module) {
  const products = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "products.json"), "utf8"));
  const reviews = generateReviews(products);
  fs.writeFileSync(path.join(__dirname, "data", "reviews.json"), JSON.stringify(reviews, null, 1));
  console.log("wrote", reviews.length, "reviews for", products.length, "products");
}

module.exports = { generateReviews, genderOf };
