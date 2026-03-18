const Product = require('../models/Product');
const Offer = require('../models/Offer');

function maxOfferDiscountForProduct(product, offers) {
  const catId = String(product.category?._id || product.category || '');
  const productId = String(product._id);
  const collectionIds = new Set((product.collections || []).map((c) => String(c)));

  let max = 0;
  for (const o of offers) {
    let applies = false;
    switch (o.appliesTo) {
      case 'all':
        applies = true;
        break;
      case 'category':
        applies = o.category && catId === String(o.category);
        break;
      case 'product':
        applies = (o.products || []).some((pid) => String(pid) === productId);
        break;
      case 'collection':
        applies = (o.collections || []).some((cid) => collectionIds.has(String(cid)));
        break;
      default:
        applies = false;
    }
    if (applies && Number(o.discountPercent) > max) {
      max = Number(o.discountPercent);
    }
  }
  return max;
}

function compareAtDiscountPercent(product) {
  const cap = product.compareAtPrice;
  const p = product.price;
  if (cap == null || cap <= p || cap <= 0) return 0;
  return Math.round(((cap - p) / cap) * 100);
}

/**
 * GET /api/hero-sale
 * Product with highest effective discount (admin offers + compare-at).
 * Tie: same discount → latest created product.
 */
async function getHeroSale(req, res) {
  try {
    const now = new Date();
    const [offers, products] = await Promise.all([
      Offer.find({
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now },
      }).lean(),
      Product.find({ isActive: true }).select('name slug images price compareAtPrice category collections createdAt').lean(),
    ]);

    let best = null;

    for (const p of products) {
      const offerD = maxOfferDiscountForProduct(p, offers);
      const compareD = compareAtDiscountPercent(p);
      const discount = Math.max(offerD, compareD);
      if (discount <= 0) continue;

      let finalPrice;
      let price; // pre-discount display (strikethrough / reference)
      if (offerD >= compareD && offerD > 0) {
        finalPrice = Math.round(p.price * (100 - offerD) * 100) / 10000;
        price = p.price;
      } else {
        finalPrice = p.price;
        price = p.compareAtPrice;
      }

      const created = new Date(p.createdAt || 0).getTime();
      if (
        !best ||
        discount > best.discountPercentage ||
        (discount === best.discountPercentage && created > best._created)
      ) {
        best = {
          _id: p._id,
          name: p.name,
          slug: p.slug,
          image: Array.isArray(p.images) && p.images[0] ? p.images[0] : null,
          price,
          discountPercentage: discount,
          finalPrice,
          _created: created,
        };
      }
    }

    if (!best) {
      return res.json({ product: null });
    }

    delete best._created;
    return res.json({ product: best });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

module.exports = { getHeroSale };
