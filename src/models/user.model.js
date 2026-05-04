const { query } = require("../db/postgres");
const { comparePassword, hashPassword } = require("../lib/auth");

function mapUser(row) {
  if (!row) return null;
  const passwordHash = row.password_hash;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    async matchPassword(plain) {
      return comparePassword(plain, passwordHash);
    },
    toJSON() {
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    },
  };
}

class User {
  static async findOne(filter) {
    if (filter.email) {
      const result = await query("SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1", [filter.email]);
      return mapUser(result.rows[0]);
    }
    return null;
  }

  static async findById(id) {
    const result = await query("SELECT * FROM users WHERE id = $1 LIMIT 1", [id]);
    return mapUser(result.rows[0]);
  }

  static async create(payload) {
    const normalizedEmail = String(payload.email).toLowerCase();
    const passwordHash = await hashPassword(payload.passwordHash);
    const result = await query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [payload.name, normalizedEmail, passwordHash, payload.role || "user"]
    );
    return mapUser(result.rows[0]);
  }

  static async updatePassword(id, nextPassword) {
    const passwordHash = await hashPassword(nextPassword);
    const result = await query(
      `UPDATE users
       SET password_hash = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, passwordHash]
    );
    return mapUser(result.rows[0]);
  }

  static async countCustomers(keyword = "") {
    const result = await query(
      `SELECT COUNT(*)::int AS total
       FROM users
       WHERE role <> 'admin'
         AND ($1 = '' OR name ILIKE $2 OR email ILIKE $2)`,
      [keyword, `%${keyword}%`]
    );
    return result.rows[0]?.total || 0;
  }

  static async listCustomers({ page, limit, keyword = "" }) {
    const result = await query(
      `SELECT id, name, email, role, created_at, updated_at
       FROM users
       WHERE role <> 'admin'
         AND ($1 = '' OR name ILIKE $2 OR email ILIKE $2)
       ORDER BY created_at DESC
       LIMIT $3 OFFSET $4`,
      [keyword, `%${keyword}%`, limit, (page - 1) * limit]
    );
    return result.rows.map((row) => mapUser(row).toJSON());
  }

  static async countUsers(keyword = "", role = "") {
    const result = await query(
      `SELECT COUNT(*)::int AS total
       FROM users
       WHERE ($1 = '' OR role = $1)
         AND ($2 = '' OR name ILIKE $3 OR email ILIKE $3 OR role ILIKE $3)`,
      [role, keyword, `%${keyword}%`]
    );
    return result.rows[0]?.total || 0;
  }

  static async listUsers({ page, limit, keyword = "", role = "" }) {
    const result = await query(
      `SELECT id, name, email, role, created_at, updated_at
       FROM users
       WHERE ($1 = '' OR role = $1)
         AND ($2 = '' OR name ILIKE $3 OR email ILIKE $3 OR role ILIKE $3)
       ORDER BY created_at DESC
       LIMIT $4 OFFSET $5`,
      [role, keyword, `%${keyword}%`, limit, (page - 1) * limit]
    );
    return result.rows.map((row) => mapUser(row).toJSON());
  }

  static async updateById(id, payload) {
    const normalizedEmail = String(payload.email).toLowerCase();
    const result = await query(
      `UPDATE users
       SET name = $2,
           email = $3,
           role = $4,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, payload.name, normalizedEmail, payload.role]
    );
    return mapUser(result.rows[0]);
  }
}

module.exports = { User };
