require("dotenv").config();
const mongoose = require("mongoose");
const { connectPostgres, withTransaction } = require("../db/postgres");

const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const mongoDbName = process.env.MONGODB_DB || "btck-shop";

function toDate(value) {
  return value ? new Date(value) : new Date();
}

async function run() {
  await connectPostgres();
  await mongoose.connect(mongoUri, { dbName: mongoDbName });

  const mongoDb = mongoose.connection.db;
  const users = await mongoDb.collection("users").find({}).toArray();
  const products = await mongoDb.collection("products").find({}).toArray();
  const orders = await mongoDb.collection("orders").find({}).toArray();
  const reviews = await mongoDb.collection("reviews").find({}).toArray();

  const userIdMap = new Map();
  const productIdMap = new Map();

  await withTransaction(async (client) => {
    for (const user of users) {
      const inserted = await client.query(
        `INSERT INTO users (name, email, password_hash, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (email)
         DO UPDATE SET
           name = EXCLUDED.name,
           password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role,
           updated_at = EXCLUDED.updated_at
         RETURNING id`,
        [
          user.name || "Unknown",
          String(user.email || "").toLowerCase(),
          user.passwordHash || user.password_hash || "",
          user.role || "user",
          toDate(user.createdAt),
          toDate(user.updatedAt),
        ]
      );
      userIdMap.set(String(user._id), inserted.rows[0].id);
    }

    for (const product of products) {
      const inserted = await client.query(
        `INSERT INTO products
          (title, slug, price, discount_price, images, stock, rating, brand, variants, description, category, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9::jsonb, $10, $11, $12, $13, $14)
         ON CONFLICT (slug)
         DO UPDATE SET
           title = EXCLUDED.title,
           price = EXCLUDED.price,
           discount_price = EXCLUDED.discount_price,
           images = EXCLUDED.images,
           stock = EXCLUDED.stock,
           rating = EXCLUDED.rating,
           brand = EXCLUDED.brand,
           variants = EXCLUDED.variants,
           description = EXCLUDED.description,
           category = EXCLUDED.category,
           is_active = EXCLUDED.is_active,
           updated_at = EXCLUDED.updated_at
         RETURNING id`,
        [
          product.title,
          product.slug,
          Number(product.price || 0),
          Number(product.discountPrice || 0),
          JSON.stringify(product.images || []),
          Number(product.stock || 0),
          Number(product.rating || 0),
          product.brand || null,
          JSON.stringify(product.variants || []),
          product.description || null,
          product.category || "uncategorized",
          product.isActive ?? true,
          toDate(product.createdAt),
          toDate(product.updatedAt),
        ]
      );
      productIdMap.set(String(product._id), inserted.rows[0].id);
    }

    await client.query("DELETE FROM order_items");
    await client.query("DELETE FROM orders");

    for (const order of orders) {
      const insertedOrder = await client.query(
        `INSERT INTO orders
          (user_id, subtotal, shipping_fee, total, customer_name, customer_phone, customer_address, payment_method, note, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id`,
        [
          order.userId ? userIdMap.get(String(order.userId)) || null : null,
          Number(order.subtotal || 0),
          Number(order.shippingFee || 0),
          Number(order.total || 0),
          order.customerName || "Unknown",
          order.customerPhone || null,
          order.customerAddress || null,
          order.paymentMethod || "cod",
          order.note || null,
          order.status || "pending",
          toDate(order.createdAt),
          toDate(order.updatedAt),
        ]
      );

      for (const item of order.items || []) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, title, price, quantity, image)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            insertedOrder.rows[0].id,
            item.productId ? productIdMap.get(String(item.productId)) || null : null,
            item.title || "Unknown product",
            Number(item.price || 0),
            Number(item.quantity || 1),
            item.image || null,
          ]
        );
      }
    }

    await client.query("DELETE FROM reviews");

    for (const review of reviews) {
      const productId = productIdMap.get(String(review.productId));
      const userId = userIdMap.get(String(review.userId));
      if (!productId || !userId) continue;

      await client.query(
        `INSERT INTO reviews (product_id, user_id, rating, comment, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          productId,
          userId,
          Number(review.rating || 0),
          review.comment || "",
          toDate(review.createdAt),
          toDate(review.updatedAt),
        ]
      );
    }
  });

  console.log(`Migrated ${users.length} users, ${products.length} products, ${orders.length} orders, ${reviews.length} reviews.`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch (_err) {
    // ignore disconnect errors
  }
  process.exit(1);
});
