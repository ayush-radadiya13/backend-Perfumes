const Order = require('../models/Order');

/** Status order for auto-advance (never demote; cancelled is excluded). */
const STATUS_RANK = { pending: 0, paid: 1, shipped: 2, delivered: 3 };

/**
 * Total hours from order creation until status becomes `delivered` (3 equal stages after pending).
 * Default: 12h + 12h + 12h = 36h from creation to delivered.
 */
const TOTAL_HOURS_TO_DELIVERED = Number(process.env.ORDER_AUTO_TOTAL_HOURS || 36);
const STAGE_HOURS = TOTAL_HOURS_TO_DELIVERED / 3;

/**
 * From age in hours, compute the minimum status the order should have by now.
 */
function expectedStatusFromAgeHours(hours) {
  if (hours >= STAGE_HOURS * 3) return 'delivered';
  if (hours >= STAGE_HOURS * 2) return 'shipped';
  if (hours >= STAGE_HOURS) return 'paid';
  return 'pending';
}

/**
 * Advance orders along pending → paid → shipped → delivered based on age.
 * Skips cancelled. Only moves forward, never downgrades (e.g. manual delivered stays).
 */
async function runOrderAutoStatus() {
  const enabled = process.env.ORDER_AUTO_STATUS_ENABLED !== 'false';
  if (!enabled) return { skipped: true, updated: 0 };

  const now = Date.now();
  const orders = await Order.find({
    status: { $nin: ['cancelled', 'delivered'] },
    $or: [{ paymentStatus: { $exists: false } }, { paymentStatus: 'paid' }],
  })
    .select('_id status paymentStatus createdAt')
    .lean();

  let updated = 0;
  for (const o of orders) {
    const hours = (now - new Date(o.createdAt).getTime()) / 3600000;
    const expected = expectedStatusFromAgeHours(hours);
    const cur = o.status;
    if (STATUS_RANK[expected] > STATUS_RANK[cur]) {
      await Order.updateOne({ _id: o._id }, { $set: { status: expected } });
      updated += 1;
    }
  }

  if (updated > 0) {
    console.log(`[orders] auto-status: advanced ${updated} order(s) toward delivered (${TOTAL_HOURS_TO_DELIVERED}h flow)`);
  }

  return { skipped: false, updated };
}

const INTERVAL_MS = Number(process.env.ORDER_AUTO_STATUS_INTERVAL_MS || 15 * 60 * 1000);

function startOrderAutoStatusJob() {
  const enabled = process.env.ORDER_AUTO_STATUS_ENABLED !== 'false';
  if (!enabled) {
    console.log('[orders] auto-status job disabled (ORDER_AUTO_STATUS_ENABLED=false)');
    return () => {};
  }

  const tick = () => {
    runOrderAutoStatus().catch((e) => console.error('[orders] auto-status error:', e.message));
  };

  tick();
  const id = setInterval(tick, INTERVAL_MS);
  return () => clearInterval(id);
}

module.exports = { runOrderAutoStatus, startOrderAutoStatusJob, expectedStatusFromAgeHours, STAGE_HOURS };
