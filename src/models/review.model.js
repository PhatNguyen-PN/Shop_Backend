const { query } = require("../db/postgres");

function mapReview(row) {
  if (!row) return null;
  return {
    id: row.id,
    productId: row.product_id,
    userId: row.user_id,
    rating: Number(row.rating),
    comment: row.comment,
    user: row.user_name
      ? {
          id: row.user_id,
          name: row.user_name,
          email: row.user_email,
        }
      : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

class Review {
  static async create(payload) {
    const result = await query(
      `INSERT INTO reviews (product_id, user_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [payload.productId, payload.userId, payload.rating, payload.comment]
    );
    return this.findById(result.rows[0].id);
  }

  static async findById(id) {
    const result = await query(
      `SELECT r.*, u.name AS user_name, u.email AS user_email
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       WHERE r.id = $1
       LIMIT 1`,
      [id]
    );
    return mapReview(result.rows[0]);
  }

  static async findByProduct(productId) {
    const result = await query(
      `SELECT r.*, u.name AS user_name, u.email AS user_email
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       WHERE r.product_id = $1
       ORDER BY r.created_at DESC`,
      [productId]
    );
    return result.rows.map(mapReview);
  }
}

module.exports = { Review };
