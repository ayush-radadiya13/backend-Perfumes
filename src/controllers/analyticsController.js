const {
  getMostPurchasedPerfumes,
  getMonthlySales,
  getGraphData,
  dashboardSummary,
} = require('../services/analyticsService');

async function mostPurchased(req, res) {
  const limit = Math.min(50, parseInt(req.query.limit, 10) || 10);
  const data = await getMostPurchasedPerfumes(limit);
  res.json(data);
}

async function monthlySales(req, res) {
  const months = Math.min(36, parseInt(req.query.months, 10) || 12);
  const data = await getMonthlySales(months);
  res.json(data);
}

async function graph(req, res) {
  const months = Math.min(36, parseInt(req.query.months, 10) || 12);
  const granularity = req.query.granularity === 'week' ? 'week' : 'month';
  const data = await getGraphData({ months, granularity });
  res.json(data);
}

async function dashboard(req, res) {
  const summary = await dashboardSummary();
  const top = await getMostPurchasedPerfumes(5);
  const monthly = await getMonthlySales(6);
  res.json({ summary, topPerfumes: top, monthlyChart: monthly });
}

module.exports = { mostPurchased, monthlySales, graph, dashboard };
