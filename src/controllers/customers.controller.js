const { User } = require("../models/user.model");

async function getCustomers(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const q = req.query.q || "";
    const role = req.query.role || "";

    const total = await User.countUsers(q, role);
    const users = await User.listUsers({ page, limit, keyword: q, role });

    res.json({
      ok: true,
      data: users,
      total,
      page,
      limit,
      hasNext: page * limit < total,
    });
  } catch (err) {
    next(err);
  }
}

async function createAdmin(req, res, next) {
  try {
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        ok: false,
        message: "Email da ton tai",
      });
    }

    const admin = await User.create({
      name,
      email,
      passwordHash: password,
      role: "admin",
    });

    return res.status(201).json({
      ok: true,
      message: "Da tao tai khoan admin",
      user: admin.toJSON(),
    });
  } catch (err) {
    next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    const userId = req.params.id;
    const { name, email, role } = req.body;
    const targetUser = await User.findById(userId);

    if (!targetUser) {
      return res.status(404).json({
        ok: false,
        message: "Tai khoan khong ton tai",
      });
    }

    const duplicated = await User.findOne({ email });
    if (duplicated && String(duplicated.id) !== String(userId)) {
      return res.status(400).json({
        ok: false,
        message: "Email da ton tai",
      });
    }

    if (String(req.user.id) === String(userId) && role !== "admin") {
      return res.status(400).json({
        ok: false,
        message: "Ban khong the tu go quyen admin cua chinh minh",
      });
    }

    const updatedUser = await User.updateById(userId, { name, email, role });

    return res.json({
      ok: true,
      message: role === "admin" ? "Da cap quyen admin" : "Da cap nhat tai khoan",
      user: updatedUser.toJSON(),
    });
  } catch (err) {
    next(err);
  }
}

async function resetUserPassword(req, res, next) {
  try {
    const userId = req.params.id;
    const { currentAdminPassword, password } = req.body;
    const targetUser = await User.findById(userId);
    const currentAdmin = await User.findById(req.user.id);

    if (!targetUser) {
      return res.status(404).json({
        ok: false,
        message: "Tai khoan khong ton tai",
      });
    }

    if (!currentAdmin) {
      return res.status(401).json({
        ok: false,
        message: "Tai khoan admin khong ton tai",
      });
    }

    const isMatch = await currentAdmin.matchPassword(currentAdminPassword);
    if (!isMatch) {
      return res.status(400).json({
        ok: false,
        message: "Mat khau hien tai cua admin khong dung",
      });
    }

    await User.updatePassword(userId, password);

    return res.json({
      ok: true,
      message: "Da dat lai mat khau tai khoan",
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getCustomers, createAdmin, updateUser, resetUserPassword };
