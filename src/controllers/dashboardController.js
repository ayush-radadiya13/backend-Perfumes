const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Aggregated dashboard stats + chart (default 6 months) */
exports.stats = async (req, res, next) => {
  try {
    const months = Math.min(24, Math.max(1, Number(req.query.months) || 6));
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthlyOrders = await Order.find({
      createdAt: { $gte: startOfMonth },
      status: { $ne: 'cancelled' },
    });

    const monthlySales = monthlyOrders.reduce((s, o) => s + o.totalAmount, 0);
    const totalOrders = await Order.countDocuments();
    const totalCustomers = await User.countDocuments({ role: 'user' });
    const totalRevenue = await Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $group: { _id: null, sum: { $sum: '$totalAmount' } } },
    ]);
    const revenueAllTime = totalRevenue[0] ? Math.round(totalRevenue[0].sum * 100) / 100 : 0;

    const productSales = await Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.product', totalQty: { $sum: '$items.quantity' }, name: { $first: '$items.name' } } },
      { $sort: { totalQty: -1 } },
      { $limit: 1 },
    ]);
    const mostPurchased = productSales[0]
      ? { productId: productSales[0]._id, name: productSales[0].name, quantity: productSales[0].totalQty }
      : null;

    const chartData = await buildSalesChart(months, now);

    res.json({
      success: true,
      data: {
        monthlySales: Math.round(monthlySales * 100) / 100,
        totalOrders,
        totalCustomers,
        revenueAllTime,
        mostPurchased,
        salesChart: chartData,
      },
    });
  } catch (e) {
    next(e);
  }
};

async function buildSalesChart(monthCount, now) {
  const ranges = [];
  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    ranges.push({ year: d.getFullYear(), month: d.getMonth() });
  }
  const from = new Date(ranges[0].year, ranges[0].month, 1);
  const salesByMonth = await Order.aggregate([
    { $match: { createdAt: { $gte: from }, status: { $ne: 'cancelled' } } },
    {
      $group: {
        _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } },
        total: { $sum: '$totalAmount' },
        count: { $sum: 1 },
      },
    },
  ]);
  return ranges.map(({ year, month }) => {
    const found = salesByMonth.find((s) => s._id.y === year && s._id.m === month + 1);
    return {
      name: `${MONTHS[month]} ${year}`,
      sales: found ? Math.round(found.total * 100) / 100 : 0,
      orders: found ? found.count : 0,
    };
  });
}

/** Graph-only API for charts (Recharts / any client) */
exports.salesGraph = async (req, res, next) => {
  try {
    const months = Math.min(24, Math.max(1, Number(req.query.months) || 12));
    const chartData = await buildSalesChart(months, new Date());
    res.json({ success: true, data: chartData });
  } catch (e) {
    next(e);
  }
};

/** Most purchased perfumes (by order line quantity) */
exports.topProducts = async (req, res, next) => {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const rows = await Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalSold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          name: { $first: '$items.name' },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: limit },
    ]);
    const ids = rows.map((r) => r._id).filter(Boolean);
    const products = await Product.find({ _id: { $in: ids } }).select('name slug images price').lean();
    const byId = Object.fromEntries(products.map((p) => [String(p._id), p]));
    const data = rows.map((r) => {
      const p = byId[String(r._id)];
      return {
        productId: r._id,
        name: r.name || p?.name,
        slug: p?.slug,
        image: p?.images?.[0],
        price: p?.price,
        totalSold: r.totalSold,
        revenue: Math.round(r.revenue * 100) / 100,
      };
    });
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

/** Current calendar month sales total + order count */
exports.monthlySales = async (req, res, next) => {
  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const orders = await Order.find({ createdAt: { $gte: start }, status: { $ne: 'cancelled' } });
    const total = orders.reduce((s, o) => s + o.totalAmount, 0);
    res.json({
      success: true,
      data: {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        monthLabel: MONTHS[now.getMonth()],
        orderCount: orders.length,
        salesTotal: Math.round(total * 100) / 100,
      },
    });
  } catch (e) {
    next(e);
  }
};

exports.customers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      User.find({ role: 'user' }).select('-password').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      User.countDocuments({ role: 'user' }),
    ]);
    res.json({ success: true, data, total });
  } catch (e) {
    next(e);
  }
};
