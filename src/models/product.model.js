const { query } = require("../db/postgres");

function mapProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    price: Number(row.price),
    discountPrice: Number(row.discount_price || 0),
    images: Array.isArray(row.images) ? row.images : [],
    stock: Number(row.stock || 0),
    rating: Number(row.rating || 0),
    brand: row.brand,
    variants: Array.isArray(row.variants) ? row.variants : [],
    description: row.description,
    category: row.category,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

class Product {
  static async create(payload) {
    const result = await query(
      `INSERT INTO products
        (title, slug, price, discount_price, images, stock, rating, brand, variants, description, category, is_active)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9::jsonb, $10, $11, $12)
       RETURNING *`,
      [
        payload.title,
        payload.slug,
        payload.price,
        payload.discountPrice || 0,
        JSON.stringify(payload.images || []),
        payload.stock,
        payload.rating ?? 0,
        payload.brand || null,
        JSON.stringify(payload.variants || []),
        payload.description || null,
        payload.category,
        payload.isActive ?? true,
      ]
    );
    return mapProduct(result.rows[0]);
  }

  static async updateById(id, patch) {
    const fields = [];
    const values = [];
    const mapping = {
      title: "title",
      slug: "slug",
      price: "price",
      discountPrice: "discount_price",
      stock: "stock",
      rating: "rating",
      brand: "brand",
      description: "description",
      category: "category",
      isActive: "is_active",
    };

    for (const [key, column] of Object.entries(mapping)) {
      if (key in patch) {
        values.push(patch[key]);
        fields.push(`${column} = $${values.length}`);
      }
    }

    if ("images" in patch) {
      values.push(JSON.stringify(patch.images || []));
      fields.push(`images = $${values.length}::jsonb`);
    }

    if ("variants" in patch) {
      values.push(JSON.stringify(patch.variants || []));
      fields.push(`variants = $${values.length}::jsonb`);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const result = await query(
      `UPDATE products
       SET ${fields.join(", ")}, updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );
    return mapProduct(result.rows[0]);
  }

  static async findById(id) {
    const result = await query("SELECT * FROM products WHERE id = $1 LIMIT 1", [id]);
    return mapProduct(result.rows[0]);
  }

  static async findBySlug(slug) {
    const result = await query("SELECT * FROM products WHERE slug = $1 LIMIT 1", [slug]);
    return mapProduct(result.rows[0]);
  }

  static async deleteById(id) {
    const result = await query("DELETE FROM products WHERE id = $1 RETURNING *", [id]);
    return mapProduct(result.rows[0]);
  }

  static async list({ page, limit, category, keyword }) {
    const values = [];
    const conditions = [];

    if (category) {
      values.push(category);
      conditions.push(`category = $${values.length}`);
    }

    if (keyword) {
      values.push(`%${keyword}%`);
      conditions.push(`title ILIKE $${values.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    values.push(limit);
    values.push((page - 1) * limit);

    const result = await query(
      `SELECT * FROM products
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );

    return result.rows.map(mapProduct);
  }

  static async count({ category, keyword } = {}) {
    const values = [];
    const conditions = [];

    if (category) {
      values.push(category);
      conditions.push(`category = $${values.length}`);
    }

    if (keyword) {
      values.push(`%${keyword}%`);
      conditions.push(`title ILIKE $${values.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await query(`SELECT COUNT(*)::int AS total FROM products ${whereClause}`, values);
    return result.rows[0]?.total || 0;
  }

  static async insertMany(items) {
    for (const item of items) {
      await this.create(item);
    }
  }
}

module.exports = { Product };
