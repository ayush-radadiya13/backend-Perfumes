require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Category = require('../models/Category');
const Collection = require('../models/Collection');
const Product = require('../models/Product');
const Offer = require('../models/Offer');
const Order = require('../models/Order');
const Rating = require('../models/Rating');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  await User.deleteMany({});
  await Category.deleteMany({});
  await Collection.deleteMany({});
  await Product.deleteMany({});
  await Offer.deleteMany({});
  await Order.deleteMany({});
  await Rating.deleteMany({});

  const admin = await User.create({
    name: 'Admin',
    email: 'admin@gmail.com',
    password: 'password',
    role: 'admin',
  });
  const user = await User.create({
    name: 'Test User',
    email: 'user@test.com',
    password: 'user123',
    role: 'user',
  });

  const cat1 = await Category.create({ name: 'Floral', slug: 'floral', description: 'Floral fragrances' });
  const cat2 = await Category.create({ name: 'Woody', slug: 'woody', description: 'Woody notes' });
  const cat3 = await Category.create({ name: 'Fresh', slug: 'fresh', description: 'Fresh & citrus' });

  const col1 = await Collection.create({ name: 'Summer', slug: 'summer', description: 'Summer collection' });
  const col2 = await Collection.create({ name: 'Winter', slug: 'winter', description: 'Winter collection' });
  const col3 = await Collection.create({ name: 'Luxury', slug: 'luxury', description: 'Luxury collection' });

  const p1 = await Product.create({
    name: 'Rose Elegance',
    slug: 'rose-elegance',
    price: 89.99,
    description: 'A delicate floral bouquet with rose and jasmine.',
    images: ['/placeholder-perfume.jpg'],
    category: cat1._id,
    collection: col1._id,
    rating: 4.5,
    ratingCount: 12,
    featured: true,
  });
  const p2 = await Product.create({
    name: 'Sandalwood Noir',
    slug: 'sandalwood-noir',
    price: 129.99,
    description: 'Rich woody notes with sandalwood and cedar.',
    images: ['/placeholder-perfume.jpg'],
    category: cat2._id,
    collection: col3._id,
    rating: 4.8,
    ratingCount: 8,
    featured: true,
  });
  const p3 = await Product.create({
    name: 'Citrus Breeze',
    slug: 'citrus-breeze',
    price: 69.99,
    description: 'Fresh citrus and bergamot.',
    images: ['/placeholder-perfume.jpg'],
    category: cat3._id,
    collection: col1._id,
    featured: false,
  });

  await Offer.create({
    product: p3._id,
    discountPercent: 20,
    salePrice: 55.99,
    active: true,
    label: 'Summer Sale',
  });

  await Rating.create({ user: user._id, product: p1._id, stars: 5, review: 'Lovely floral scent.' });
  await Rating.create({ user: user._id, product: p2._id, stars: 4, review: 'Deep woody notes.' });
  await Product.findByIdAndUpdate(p1._id, { rating: 5, ratingCount: 1 });
  await Product.findByIdAndUpdate(p2._id, { rating: 4, ratingCount: 1 });

  const mkItem = (p, qty) => ({
    product: p._id,
    name: p.name,
    price: p.price,
    quantity: qty,
    image: p.images?.[0],
  });
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const t1 = Math.round((89.99 * 2 + 129.99) * 100) / 100;
  const t2 = Math.round((89.99 * 3 + 69.99 * 2) * 100) / 100;
  await Order.collection.insertMany([
    {
      user: user._id,
      items: [mkItem(p1, 2), mkItem(p2, 1)],
      totalAmount: t1,
      status: 'delivered',
      shippingAddress: { fullName: 'Test User', line1: '1 Main St', city: 'NYC', postalCode: '10001', country: 'US' },
      createdAt: lastMonth,
      updatedAt: lastMonth,
    },
    {
      user: user._id,
      items: [mkItem(p1, 3), mkItem(p3, 2)],
      totalAmount: t2,
      status: 'delivered',
      shippingAddress: { fullName: 'Test User', line1: '1 Main St', city: 'NYC', postalCode: '10001', country: 'US' },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      user: user._id,
      items: [mkItem(p2, 1)],
      totalAmount: 129.99,
      status: 'processing',
      shippingAddress: { fullName: 'Test User', line1: '1 Main St', city: 'NYC', postalCode: '10001', country: 'US' },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  console.log('Seed done. Admin: admin@gmail.com / password | User: user@test.com / user123');
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
