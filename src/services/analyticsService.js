const Order = require('../models/Order');
const Product = require('../models/Product');

/**
 * Most purchased from order line items (paid/delivered/shipped for "sales")
 */
async function getMostPurchasedPerfumes(limit = 10) {
  const match = {
    status: { $in: ['paid', 'shipped', 'delivered'] },
  };
  const agg = await Order.aggregate([
    { $match: match },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        totalQty: { $sum: '$items.quantity' },
        revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
      },
    },
    { $sort: { totalQty: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'product',
      },
    },
    { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        productId: '$_id',
        name: '$product.name',
        slug: '$product.slug',
        images: '$product.images',
        totalQty: 1,
        revenue: 1,
      },
    },
  ]);
  return agg;
}

/**
 * Monthly sales totals (last `months` months)
 */
async function getMonthlySales(months = 12) {
  const start = new Date();
  start.setMonth(start.getMonth() - months);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const agg = await Order.aggregate([
    {
      $match: {
        status: { $in: ['paid', 'shipped', 'delivered'] },
        createdAt: { $gte: start },
      },
    },
    {
      $group: {
        _id: {
          y: { $year: '$createdAt' },
          m: { $month: '$createdAt' },
        },
        totalSales: { $sum: '$total' },
        orderCount: { $sum: 1 },
      },
    },
    { $sort: { '_id.y': 1, '_id.m': 1 } },
  ]);

  const labels = [];
  const sales = [];
  const orders = [];
  for (const row of agg) {
    const label = `${row._id.y}-${String(row._id.m).padStart(2, '0')}`;
    labels.push(label);
    sales.push(Math.round(row.totalSales * 100) / 100);
    orders.push(row.orderCount);
  }
  return { labels, sales, orders };
}

/**
 * Graph API: optional granularity month|week
 */
async function getGraphData({ months = 12, granularity = 'month' } = {}) {
  if (granularity === 'week') {
    const start = new Date();
    start.setDate(start.getDate() - months * 7);
    const agg = await Order.aggregate([
      {
        $match: {
          status: { $in: ['paid', 'shipped', 'delivered'] },
          createdAt: { $gte: start },
        },
      },
      {
        $group: {
          _id: {
            y: { $year: '$createdAt' },
            w: { $week: '$createdAt' },
          },
          totalSales: { $sum: '$total' },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { '_id.y': 1, '_id.w': 1 } },
    ]);
    return {
      granularity: 'week',
      labels: agg.map((r) => `${r._id.y}-W${r._id.w}`),
      sales: agg.map((r) => Math.round(r.totalSales * 100) / 100),
      orders: agg.map((r) => r.orderCount),
    };
  }
  const m = await getMonthlySales(months);
  return { granularity: 'month', ...m };
}

async function dashboardSummary() {
  const [orderStats, productCount, categoryCount] = await Promise.all([
    Order.aggregate([
      {
        $facet: {
          revenue: [
            { $match: { status: { $in: ['paid', 'shipped', 'delivered'] } } },
            { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
          ],
          pending: [{ $match: { status: 'pending' } }, { $count: 'c' }],
        },
      },
    ]),
    Product.countDocuments({ isActive: true }),
    require('../models/Category').countDocuments({ isActive: true }),
  ]);

  const rev = orderStats[0]?.revenue?.[0] || { total: 0, count: 0 };
  const pending = orderStats[0]?.pending?.[0]?.c || 0;

  const now = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonth = await Order.aggregate([
    {
      $match: {
        status: { $in: ['paid', 'shipped', 'delivered'] },
        createdAt: { $gte: startMonth },
      },
    },
    { $group: { _id: null, total: { $sum: '$total' } } },
  ]);

  return {
    totalRevenue: Math.round((rev.total || 0) * 100) / 100,
    totalOrders: rev.count || 0,
    pendingOrders: pending,
    monthlySales: Math.round((thisMonth[0]?.total || 0) * 100) / 100,
    activeProducts: productCount,
    activeCategories: categoryCount,
  };
}

module.exports = {
  getMostPurchasedPerfumes,
  getMonthlySales,
  getGraphData,
  dashboardSummary,
};
