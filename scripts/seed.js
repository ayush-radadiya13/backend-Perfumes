/**
 * Seed demo data + default admin.
 * Usage: npm run seed  (from backend folder)
 * Requires MongoDB running and .env with MONGODB_URI
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Admin = require('../src/models/Admin');
const Category = require('../src/models/Category');
const Collection = require('../src/models/Collection');
const Product = require('../src/models/Product');
const Offer = require('../src/models/Offer');

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/perfumes_ecommerce';
  await mongoose.connect(uri);
  console.log('Connected');

  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@gmail.com').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || 'password';
  const hash = await Admin.hashPassword(password);

  let admin = await Admin.findOne({ email });
  if (admin) {
    admin.passwordHash = hash;
    await admin.save();
    console.log('Admin ready:', email, '/', password, '(password synced)');
  } else {
    const legacy = await Admin.findOne({ email: 'admin@perfumes.local' });
    if (legacy && email === 'admin@gmail.com') {
      legacy.email = email;
      legacy.passwordHash = hash;
      await legacy.save();
      console.log('Migrated admin@perfumes.local →', email, '/', password);
    } else {
      await Admin.create({
        email,
        passwordHash: hash,
        name: 'Super Admin',
      });
      console.log('Admin created:', email, '/', password);
    }
  }

  let catWood = await Category.findOne({ slug: 'woody' });
  if (!catWood) {
    catWood = await Category.create({
      name: 'Woody',
      slug: 'woody',
      description: 'Sandalwood, cedar, oud',
    });
  }
  let catFloral = await Category.findOne({ slug: 'floral' });
  if (!catFloral) {
    catFloral = await Category.create({
      name: 'Floral',
      slug: 'floral',
      description: 'Rose, jasmine, lily',
    });
  }

  let colWinter = await Collection.findOne({ slug: 'winter-night' });
  if (!colWinter) {
    colWinter = await Collection.create({
      name: 'Winter Night',
      slug: 'winter-night',
      description: 'Deep evening scents',
      featured: true,
    });
  }

  const products = [
    {
      name: 'Noir Oud',
      slug: 'noir-oud',
      description: 'Rich oud with saffron and amber.',
      price: 189,
      category: catWood._id,
      collections: [colWinter._id],
      stock: 25,
      volumeMl: 100,
      fragranceNotes: 'Top: Saffron · Heart: Oud · Base: Amber',
      images: [],
    },
    {
      name: 'Velvet Rose',
      slug: 'velvet-rose',
      description: 'Bulgarian rose and musk.',
      price: 145,
      category: catFloral._id,
      collections: [],
      stock: 40,
      volumeMl: 50,
      fragranceNotes: 'Rose, peony, white musk',
      images: [],
    },
    {
      name: 'Santal Drift',
      slug: 'santal-drift',
      description: 'Creamy sandalwood and vanilla.',
      price: 165,
      category: catWood._id,
      collections: [colWinter._id],
      stock: 30,
      volumeMl: 75,
      images: [],
    },
  ];

  for (const p of products) {
    const exists = await Product.findOne({ slug: p.slug });
    if (!exists) {
      await Product.create(p);
      console.log('Product:', p.name);
    }
  }

  const start = new Date();
  const end = new Date();
  end.setMonth(end.getMonth() + 2);
  const offerExists = await Offer.findOne({ code: 'WELCOME10' });
  if (!offerExists) {
    await Offer.create({
      title: 'Welcome 10%',
      description: 'New customers',
      discountPercent: 10,
      appliesTo: 'all',
      startDate: start,
      endDate: end,
      code: 'WELCOME10',
      isActive: true,
    });
    console.log('Offer WELCOME10 created');
  }

  console.log('Seed done.');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
