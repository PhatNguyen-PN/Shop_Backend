require("dotenv").config();
const { connectPostgres, query } = require("../db/postgres");
const { Product } = require("../models/product.model");

const COLLECTIONS = [
  "Aurora",
  "Celeste",
  "Lumiere",
  "Opaline",
  "Velvet Dawn",
  "Golden Hour",
  "Noir Muse",
  "Maison Pearl",
  "Silk Halo",
  "Rosette",
  "Solstice",
  "Moonline",
];

const PRODUCT_TYPES = [
  { singular: "Nhan", plural: "rings", variantKey: "size", options: ["5", "6", "7", "8"] },
  { singular: "Day chuyen", plural: "necklaces", variantKey: "size", options: ["40cm", "45cm", "50cm"] },
  { singular: "Vong tay", plural: "bracelets", variantKey: "size", options: ["15cm", "16cm", "17cm"] },
  { singular: "Hoa tai", plural: "earrings", variantKey: "style", options: ["Stud", "Drop", "Hoop"] },
  { singular: "Mat day chuyen", plural: "pendants", variantKey: "finish", options: ["Classic", "Mirror", "Matte"] },
  { singular: "Ghim cai ao", plural: "brooches", variantKey: "finish", options: ["Polished", "Brushed", "Satin"] },
];

const MATERIALS = ["Vang 18K", "Vang hong", "Bac 925", "Bach kim"];
const GEMSTONES = ["Ngoc trai", "Kim cuong", "Sapphire", "Emerald", "Moissanite", "Topaz"];
const FINISHES = ["Champagne", "Ivory", "Midnight", "Rose", "Honey", "Pearl"];
const BRANDS = ["Trang Suc Atelier", "Lustre House", "Maison Aura", "Vera Fine"];
const COLORS = ["Vang", "Hong", "Bac", "Trang ngoc"];
const IMAGE_SET = [
  "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1611652022419-a9419f74343d?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1617038220319-276d3cfab638?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1543295204-8e6d2d5fcb7a?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1617038260897-8e7d35f1b4f8?q=80&w=1200&auto=format&fit=crop",
];

function slugify(input) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildDocs() {
  return Array.from({ length: 150 }, (_, i) => {
    const n = i + 1;
    const collection = COLLECTIONS[i % COLLECTIONS.length];
    const type = PRODUCT_TYPES[i % PRODUCT_TYPES.length];
    const material = MATERIALS[i % MATERIALS.length];
    const gemstone = GEMSTONES[(i * 2) % GEMSTONES.length];
    const finish = FINISHES[(i * 3) % FINISHES.length];
    const brand = BRANDS[i % BRANDS.length];
    const title = `${type.singular} ${collection} ${gemstone} ${String(n).padStart(3, "0")}`;
    const firstOption = type.options[i % type.options.length];
    const secondOption = type.options[(i + 1) % type.options.length];

    return {
      title,
      slug: slugify(title),
      price: 1450000 + n * 85000,
      images: [IMAGE_SET[i % IMAGE_SET.length]],
      stock: n % 17 === 0 ? 0 : 4 + (n % 18),
      rating: 4 + ((n % 10) / 10),
      brand,
      variants: [
        { color: COLORS[i % COLORS.length], [type.variantKey]: firstOption },
        { color: COLORS[(i + 1) % COLORS.length], [type.variantKey]: secondOption },
      ],
      description: `${type.singular} thuoc dong ${collection}, hoan thien ${material} voi diem nhan ${gemstone} va sac do ${finish}, phu hop cho phong cach thanh lich hien dai.`,
      category: type.plural,
    };
  });
}

async function run() {
  await connectPostgres();
  const docs = buildDocs();
  const existingResult = await query("SELECT slug FROM products");
  const existingSlugs = new Set(existingResult.rows.map((row) => row.slug));
  const missingDocs = docs.filter((doc) => !existingSlugs.has(doc.slug));

  if (missingDocs.length === 0) {
    console.log(`DB already has all ${docs.length} jewelry products.`);
    process.exit(0);
  }

  await Product.insertMany(missingDocs);
  console.log(`Seeded ${missingDocs.length} jewelry products. Total template size: ${docs.length}.`);
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
