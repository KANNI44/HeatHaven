const bcrypt = require('bcryptjs');

const { connectDB } = require('../config/db');
const User = require('../models/User');
const Product = require('../models/Product');

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Admin';

  if (!email || !password) return;

  const existing = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (existing) {
    if (existing.role !== 'admin') {
      existing.role = 'admin';
      await existing.save();
    }
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({
    name,
    email: String(email).toLowerCase().trim(),
    passwordHash,
    role: 'admin',
    phone: null,
  });
}

async function seedProducts() {
  // Keep these legacyIds stable so your existing HTML can reference them via `data-product-id`.
  // Sizes match your UI dropdowns: UK 6 ... UK 12.
  const sizes = ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11', 'UK 12'];

  const seeds = [
    {
      legacyId: 1,
      name: 'Air Jordan 1 Retro High',
      brand: 'jordan',
      colorway: 'Chicago Bulls',
      category: 'jordan',
      imageMain: 'images/aj 1 chicago solo (1).png',
      variants: [
        { size: sizes[0], price: 22000, stock: 25 },
        { size: sizes[1], price: 23000, stock: 25 },
        { size: sizes[2], price: 21500, stock: 25 },
        { size: sizes[3], price: 24000, stock: 25 },
        { size: sizes[4], price: 24500, stock: 25 },
        { size: sizes[5], price: 25000, stock: 25 },
        { size: sizes[6], price: 25500, stock: 25 },
      ],
    },
    {
      legacyId: 2,
      name: 'Yeezy 700 V3',
      brand: 'yeezy',
      colorway: 'Azael',
      category: 'yeezy',
      imageMain: 'images/yzy 700 v3 azael.png',
      variants: [
        { size: sizes[0], price: 12400, stock: 25 },
        { size: sizes[1], price: 13000, stock: 25 },
        { size: sizes[2], price: 18000, stock: 25 },
        { size: sizes[3], price: 19000, stock: 25 },
        { size: sizes[4], price: 17000, stock: 25 },
        { size: sizes[5], price: 20500, stock: 25 },
        { size: sizes[6], price: 20500, stock: 25 },
      ],
    },
    {
      legacyId: 3,
      name: 'Nike Uptempo Slide Bulls',
      brand: 'slides',
      colorway: 'Bulls',
      category: 'nike',
      imageMain: 'images/uptempo slide bulls.png',
      variants: [
        { size: sizes[0], price: 26000, stock: 25 },
        { size: sizes[1], price: 21500, stock: 25 },
        { size: sizes[2], price: 28000, stock: 25 },
        { size: sizes[3], price: 28000, stock: 25 },
        { size: sizes[4], price: 36000, stock: 25 },
        { size: sizes[5], price: 47000, stock: 25 },
        { size: sizes[6], price: 33000, stock: 25 },
      ],
    },
    {
      legacyId: 4,
      name: 'Travis Scott x Fragment High',
      brand: 'travis',
      colorway: 'Fragment',
      category: 'jordan',
      imageMain: 'images/travis x fragment high.png',
      variants: [
        { size: sizes[0], price: 94000, stock: 10 },
        { size: sizes[1], price: 295000, stock: 10 },
        { size: sizes[2], price: 306000, stock: 10 },
        { size: sizes[3], price: 218000, stock: 10 },
        { size: sizes[4], price: 222000, stock: 10 },
        { size: sizes[5], price: 205000, stock: 10 },
        { size: sizes[6], price: 127000, stock: 10 },
      ],
    },
    // Remaining catalog items: fixed price per size (simple seed).
    {
      legacyId: 5,
      name: 'Nike SB Dunk Low',
      brand: 'nike',
      colorway: 'Golf',
      category: 'nike',
      imageMain: 'images/sb gulf.png',
      variants: sizes.map(s => ({ size: s, price: 5559, stock: 30 })),
    },
    {
      legacyId: 6,
      name: 'Adidas Campus',
      brand: 'adidas',
      colorway: 'Clear Sky Gum',
      category: 'adidas',
      imageMain: 'images/adidas campus clear sky gum.png',
      variants: sizes.map(s => ({ size: s, price: 5559, stock: 30 })),
    },
    {
      legacyId: 7,
      name: 'Air Force 1 Low',
      brand: 'nike',
      colorway: 'Lakers Home',
      category: 'nike',
      imageMain: 'images/af1 kobe yellow.png',
      variants: sizes.map(s => ({ size: s, price: 5559, stock: 30 })),
    },
    {
      legacyId: 8,
      name: 'Yeezy Boost 350 V2',
      brand: 'yeezy',
      colorway: 'Zebra',
      category: 'yeezy',
      imageMain: 'images/yeezy zebra.png',
      variants: sizes.map(s => ({ size: s, price: 5559, stock: 30 })),
    },
    {
      legacyId: 9,
      name: 'Rick Owens Hollywood High',
      brand: 'rick owens',
      colorway: 'Black Milk',
      category: 'rick owens',
      imageMain: 'images/rick owens hollywood high black milk.png',
      variants: sizes.map(s => ({ size: s, price: 5559, stock: 30 })),
    },
    {
      legacyId: 10,
      name: 'Puma Melns',
      brand: 'puma',
      colorway: 'La France',
      category: 'puma',
      imageMain: 'images/puma melons lafrance.png',
      variants: sizes.map(s => ({ size: s, price: 5559, stock: 30 })),
    },
    {
      legacyId: 11,
      name: 'New Balance 990v5',
      brand: 'newbalance',
      colorway: 'Grey',
      category: 'newbalance',
      imageMain: 'images/nb 990v5.png',
      variants: sizes.map(s => ({ size: s, price: 5559, stock: 30 })),
    },
    {
      legacyId: 12,
      name: 'Air Jordan 4 Retro',
      brand: 'jordan',
      colorway: 'Breds',
      category: 'jordan',
      imageMain: 'images/aj4 bred.png',
      variants: sizes.map(s => ({ size: s, price: 5559, stock: 30 })),
    },
    {
      legacyId: 13,
      name: 'Salehe Bembury x Crocs',
      brand: 'crocs',
      colorway: 'Horchata',
      category: 'crocs',
      imageMain: 'images/crocs horchata.png',
      variants: sizes.map(s => ({ size: s, price: 5559, stock: 30 })),
    },
  ];

  // Only insert/update if collection is empty or legacyIds are missing.
  const existingCount = await Product.countDocuments();
  if (existingCount > 0) {
    // Still upsert the known seed products to keep stock/price consistent.
    for (const seed of seeds) {
      await Product.updateOne({ legacyId: seed.legacyId }, seed, { upsert: true });
    }
    return;
  }

  await Product.insertMany(seeds);
}

async function seedAll() {
  await seedAdmin();
  await seedProducts();
}

async function run() {
  await connectDB();
  await seedAll();
  console.log('✅ Seed completed.');
  process.exit(0);
}

module.exports = { seedAll, run };

if (require.main === module) {
  run().catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}

