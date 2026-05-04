const { Product } = require("../models/product.model");
const { Order } = require("../models/order.model");
const { calcTotals } = require("../lib/checkout");

function isValidId(value) {
  return /^\d+$/.test(String(value));
}

async function createOrder(req, res, next) {
  try {
    const { customerName, customerPhone, customerAddress, paymentMethod, note, items } = req.body;
    const userId = req.user ? req.user.id : null;
    const snapshot = [];

    for (const it of items) {
      const product = isValidId(it.productId)
        ? await Product.findById(Number(it.productId))
        : await Product.findBySlug(it.productId);

      if (!product) {
        return res.status(404).json({ ok: false, error: { code: "PRODUCT_NOT_FOUND", message: String(it.productId) } });
      }

      if ((product.stock ?? 0) < it.quantity) {
        return res.status(400).json({ ok: false, error: { code: "OUT_OF_STOCK", message: product.title } });
      }

      snapshot.push({
        productId: product.id,
        title: product.title,
        price: product.price,
        quantity: it.quantity,
        image: product.images?.[0],
      });
    }

    const totals = calcTotals(snapshot, customerAddress);
    const order = await Order.create({
      userId,
      items: snapshot,
      subtotal: totals.subtotal,
      shippingFee: totals.shippingFee,
      total: totals.total,
      customerName,
      customerPhone,
      customerAddress,
      paymentMethod,
      note,
      status: "pending",
    });

    return res.status(201).json({ ok: true, order });
  } catch (err) {
    next(err);
  }
}

async function getOrderById(req, res, next) {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ ok: false, error: { code: "BAD_ID", message: "Invalid order id" } });
    }

    const order = await Order.findById(Number(id));
    if (!order) {
      return res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Order not found" } });
    }

    return res.json({ ok: true, data: order });
  } catch (err) {
    next(err);
  }
}

async function listOrders(req, res, next) {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 50);
    const qPhone = (req.query.phone || "").trim();
    const qStatus = (req.query.status || "").trim();

    const [data, total] = await Promise.all([
      Order.list({ page, limit, phone: qPhone, status: qStatus }),
      Order.count({ phone: qPhone, status: qStatus }),
    ]);

    return res.json({ ok: true, data, page, limit, total, hasNext: page * limit < total });
  } catch (err) {
    next(err);
  }
}

async function getOrdersPublic(req, res, next) {
  try {
    const { phone } = req.query;
    const userId = req.user ? req.user.id : null;

    if (userId) {
      return res.json({ ok: true, data: await Order.findPublic({ userId }) });
    }

    if (phone) {
      return res.json({ ok: true, data: await Order.findPublic({ phone: phone.trim() }) });
    }

    return res.json({ ok: true, data: [] });
  } catch (err) {
    next(err);
  }
}

async function trackOrder(req, res, next) {
  try {
    const { orderId, phone } = req.body;

    if (!orderId || !phone) {
      return res.status(400).json({ ok: false, error: { message: "Thieu thong tin tra cuu" } });
    }

    if (!isValidId(orderId)) {
      return res.status(404).json({ ok: false, error: { message: "Khong tim thay don hang" } });
    }

    const order = await Order.findById(Number(orderId));
    if (!order) {
      return res.status(404).json({ ok: false, error: { message: "Khong tim thay don hang" } });
    }

    if (order.customerPhone !== phone.trim()) {
      return res.status(403).json({ ok: false, error: { message: "So dien thoai khong khop voi don hang nay" } });
    }

    return res.json({ ok: true, order });
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ["pending", "confirmed", "shipping", "completed", "canceled"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ ok: false, error: { message: "Trang thai khong hop le" } });
    }

    if (!isValidId(id)) {
      return res.status(400).json({ ok: false, error: { message: "ID don hang khong hop le" } });
    }

    const order = await Order.updateStatus(Number(id), status);
    if (!order) {
      return res.status(404).json({ ok: false, error: { message: "Khong tim thay don" } });
    }

    return res.json({ ok: true, data: order });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createOrder,
  getOrderById,
  listOrders,
  getOrdersPublic,
  trackOrder,
  updateStatus,
};
