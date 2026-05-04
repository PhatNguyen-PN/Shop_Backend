const { Order } = require("../models/order.model");
const { Product } = require("../models/product.model");
const { query } = require("../db/postgres");

async function getDashboardStats(req, res, next) {
  try {
    const revenueStats = await query(
      `SELECT COALESCE(SUM(total), 0)::float AS total_revenue
       FROM orders
       WHERE status <> 'canceled'`
    );
    const totalRevenue = revenueStats.rows[0]?.total_revenue || 0;

    const [totalOrders, totalProducts, pendingOrders] = await Promise.all([
      Order.count({}),
      Product.count({}),
      Order.count({ status: "pending" }),
    ]);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyRevenue = await query(
      `SELECT TO_CHAR(created_at, 'YYYY-MM-DD') AS day, COALESCE(SUM(total), 0)::float AS total
       FROM orders
       WHERE created_at >= $1
         AND status <> 'canceled'
       GROUP BY day
       ORDER BY day ASC`,
      [sevenDaysAgo]
    );

    const chartData = dailyRevenue.rows.map((item) => {
      const [, month, day] = item.day.split("-");
      return {
        name: `${day}/${month}`,
        total: item.total,
      };
    });

    res.json({
      ok: true,
      data: {
        revenue: totalRevenue,
        orders: totalOrders,
        products: totalProducts,
        pendingOrders,
        chartData,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getDashboardStats };
