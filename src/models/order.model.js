const { query, withTransaction } = require("../db/postgres");

function mapOrder(row, items = []) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    items,
    subtotal: Number(row.subtotal),
    shippingFee: Number(row.shipping_fee || 0),
    total: Number(row.total),
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerAddress: row.customer_address,
    paymentMethod: row.payment_method,
    note: row.note,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapOrderItem(row) {
  return {
    id: row.id,
    orderId: row.order_id,
    productId: row.product_id,
    title: row.title,
    price: Number(row.price),
    quantity: Number(row.quantity),
    image: row.image,
  };
}

class Order {
  static async create(payload) {
    return withTransaction(async (client) => {
      const orderResult = await client.query(
        `INSERT INTO orders
          (user_id, subtotal, shipping_fee, total, customer_name, customer_phone, customer_address, payment_method, note, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          payload.userId || null,
          payload.subtotal,
          payload.shippingFee,
          payload.total,
          payload.customerName,
          payload.customerPhone || null,
          payload.customerAddress,
          payload.paymentMethod,
          payload.note || null,
          payload.status || "pending",
        ]
      );

      const order = orderResult.rows[0];
      const items = [];
      for (const item of payload.items) {
        const itemResult = await client.query(
          `INSERT INTO order_items (order_id, product_id, title, price, quantity, image)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [order.id, item.productId, item.title, item.price, item.quantity, item.image || null]
        );
        items.push(mapOrderItem(itemResult.rows[0]));
      }

      return mapOrder(order, items);
    });
  }

  static async findById(id) {
    const orderResult = await query("SELECT * FROM orders WHERE id = $1 LIMIT 1", [id]);
    const row = orderResult.rows[0];
    if (!row) return null;
    const itemsResult = await query("SELECT * FROM order_items WHERE order_id = $1 ORDER BY id ASC", [id]);
    return mapOrder(row, itemsResult.rows.map(mapOrderItem));
  }

  static async list({ page, limit, phone, status }) {
    const values = [];
    const conditions = [];

    if (phone) {
      values.push(`%${phone}%`);
      conditions.push(`customer_phone ILIKE $${values.length}`);
    }
    if (status) {
      values.push(status);
      conditions.push(`status = $${values.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    values.push(limit);
    values.push((page - 1) * limit);

    const result = await query(
      `SELECT * FROM orders
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );

    const orders = [];
    for (const row of result.rows) {
      orders.push(await this.findById(row.id));
    }
    return orders;
  }

  static async count({ phone, status }) {
    const values = [];
    const conditions = [];

    if (phone) {
      values.push(`%${phone}%`);
      conditions.push(`customer_phone ILIKE $${values.length}`);
    }
    if (status) {
      values.push(status);
      conditions.push(`status = $${values.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await query(`SELECT COUNT(*)::int AS total FROM orders ${whereClause}`, values);
    return result.rows[0]?.total || 0;
  }

  static async findPublic({ userId, phone }) {
    const result = userId
      ? await query("SELECT id FROM orders WHERE user_id = $1 ORDER BY created_at DESC", [userId])
      : await query("SELECT id FROM orders WHERE customer_phone = $1 ORDER BY created_at DESC", [phone]);

    const orders = [];
    for (const row of result.rows) {
      orders.push(await this.findById(row.id));
    }
    return orders;
  }

  static async updateStatus(id, status) {
    const result = await query(
      `UPDATE orders
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    if (!result.rows[0]) return null;
    return this.findById(result.rows[0].id);
  }
}

module.exports = { Order };
