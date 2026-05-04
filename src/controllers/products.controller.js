const slugify = require("slugify");
const { Product } = require("../models/product.model");

function isValidId(value) {
  return /^\d+$/.test(String(value));
}

function makeSlug(input) {
  if (!input) return "";
  return slugify(input, { lower: true, strict: true, locale: "vi" });
}

function pickUpdatable(body) {
  const allow = [
    "title",
    "slug",
    "price",
    "discountPrice",
    "images",
    "stock",
    "rating",
    "brand",
    "variants",
    "description",
    "category",
    "isActive",
  ];
  const out = {};
  for (const key of allow) {
    if (key in body) out[key] = body[key];
  }
  return out;
}

async function createProduct(req, res, next) {
  try {
    const payload = req.body;
    const slug = payload.slug ? payload.slug : makeSlug(payload.title);

    if (payload.discountPrice && payload.discountPrice > payload.price) {
      return res.status(400).json({ ok: false, message: "Gia giam khong duoc lon hon gia goc" });
    }

    const doc = await Product.create({ ...payload, slug });
    return res.status(201).json({ ok: true, product: doc });
  } catch (err) {
    if (err && err.code === "23505") {
      err.status = 409;
      err.message = "Ten san pham (slug) da ton tai, vui long doi ten khac";
    }
    return next(err);
  }
}

async function updateProduct(req, res, next) {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ ok: false, message: "ID san pham khong hop le" });
    }

    const patch = pickUpdatable(req.body);
    if (patch.title && !patch.slug) patch.slug = makeSlug(patch.title);

    const updated = await Product.updateById(Number(id), patch);
    if (!updated) {
      return res.status(404).json({ ok: false, message: "Khong tim thay san pham" });
    }

    return res.json({ ok: true, product: updated });
  } catch (err) {
    if (err && err.code === "23505") {
      err.status = 409;
      err.message = "Ten san pham (slug) bi trung lap";
    }
    return next(err);
  }
}

async function deleteProduct(req, res, next) {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ ok: false, message: "ID khong hop le" });
    }

    const del = await Product.deleteById(Number(id));
    if (!del) {
      return res.status(404).json({ ok: false, message: "Khong tim thay san pham de xoa" });
    }

    return res.json({ ok: true, deletedId: id, message: "Xoa thanh cong" });
  } catch (err) {
    return next(err);
  }
}

async function getProducts(req, res, next) {
  try {
    const page = parseInt(req.query.page || 1, 10);
    const limit = parseInt(req.query.limit || 100, 10);
    const { category, search, q } = req.query;
    const keyword = search || q;

    const [docs, total] = await Promise.all([
      Product.list({ page, limit, category, keyword }),
      Product.count({ category, keyword }),
    ]);

    return res.json({
      ok: true,
      data: docs,
      products: docs,
      total,
      page,
      limit,
    });
  } catch (err) {
    return next(err);
  }
}

async function getProductById(req, res, next) {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      const bySlug = await Product.findBySlug(id);
      if (bySlug) return res.json({ ok: true, data: bySlug });
      return res.status(400).json({ ok: false, message: "ID khong hop le" });
    }

    const doc = await Product.findById(Number(id));
    if (!doc) {
      return res.status(404).json({ ok: false, message: "San pham khong ton tai" });
    }

    return res.json({ ok: true, data: doc });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  createProduct,
  updateProduct,
  deleteProduct,
  getProducts,
  getProductById,
};
