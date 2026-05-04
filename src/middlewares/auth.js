const { verifyToken } = require("../lib/auth");
const { User } = require("../models/user.model");

async function requireAuth(req, res, next) {
  try {
    const hdr = req.headers.authorization || "";
    const token = hdr.startsWith("Bearer ") ? hdr.split(" ")[1] : null;

    if (!token) {
      return res.status(401).json({
        ok: false,
        error: { code: "UNAUTHORIZED", message: "Vui long dang nhap (Missing Token)" },
      });
    }

    const payload = verifyToken(token);
    const user = await User.findById(payload.id);

    if (!user) {
      return res.status(401).json({
        ok: false,
        error: { code: "UNAUTHORIZED", message: "User khong ton tai" },
      });
    }

    req.user = {
      id: String(user.id),
      role: user.role,
      name: user.name,
      email: user.email,
    };

    next();
  } catch (_err) {
    return res.status(401).json({
      ok: false,
      error: { code: "UNAUTHORIZED", message: "Token khong hop le hoac da het han" },
    });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: { code: "UNAUTHORIZED", message: "Yeu cau dang nhap" } });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        ok: false,
        error: { code: "FORBIDDEN", message: "Ban khong co quyen thuc hien hanh dong nay" },
      });
    }
    next();
  };
}

async function optionalAuth(req, _res, next) {
  try {
    const hdr = req.headers.authorization || "";
    const token = hdr.startsWith("Bearer ") ? hdr.split(" ")[1] : null;

    if (!token) {
      return next();
    }

    const payload = verifyToken(token);
    const user = await User.findById(payload.id);

    if (user) {
      req.user = {
        id: String(user.id),
        role: user.role,
        name: user.name,
        email: user.email,
      };
    }

    next();
  } catch (_err) {
    next();
  }
}

module.exports = { requireAuth, requireRole, optionalAuth };
