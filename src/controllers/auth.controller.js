const { User } = require("../models/user.model");
const { signToken } = require("../lib/auth");

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ ok: false, message: "Email da ton tai" });
    }

    const user = await User.create({
      name,
      email,
      passwordHash: password,
      role: "user",
    });

    res.status(201).json({
      ok: true,
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: signToken(user),
    });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      return res.json({
        ok: true,
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: signToken(user),
      });
    }

    return res.status(401).json({ ok: false, message: "Sai email hoac mat khau" });
  } catch (error) {
    next(error);
  }
}

async function me(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ ok: false, message: "Chua dang nhap" });
    }

    return res.json({
      ok: true,
      user: req.user,
    });
  } catch (error) {
    next(error);
  }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ ok: false, message: "Tai khoan khong ton tai" });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ ok: false, message: "Mat khau hien tai khong dung" });
    }

    await User.updatePassword(user.id, newPassword);

    return res.json({
      ok: true,
      message: "Da cap nhat mat khau thanh cong",
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { register, login, me, changePassword };
