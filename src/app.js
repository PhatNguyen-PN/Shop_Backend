const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const productsRouter = require("./routes/products.router");
const ordersRouter = require("./routes/orders.router");
const authRouter = require("./routes/auth.router");
const customersRouter = require("./routes/customers.router");
const statsRouter = require("./routes/stats.router");
const reviewsRouter = require("./routes/reviews.router");

const app = express();
app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

const allowedOrigins = new Set(
  [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://192.168.1.94:3000",
    "http://192.168.1.94:3001",
    "https://btck-shop.vercel.app",
    process.env.CORS_ORIGIN,
  ].filter(Boolean)
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10kb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

const apiV1 = express.Router();

apiV1.get("/health", (req, res) => {
  res.status(200).json({
    ok: true,
    service: "BTCK-api",
    version: "v1",
    env: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

apiV1.use("/auth", authRouter);
apiV1.use("/products", productsRouter);
apiV1.use("/orders", ordersRouter);
apiV1.use("/stats", statsRouter);
apiV1.use("/customers", customersRouter);
apiV1.use("/reviews", reviewsRouter);

app.use("/api/v1", apiV1);

app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "BTCK-api",
    tip: "Check health at /api/v1/health",
    version: "v1",
  });
});

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: {
      code: "NOT_FOUND",
      message: "Route not found",
      path: req.originalUrl,
    },
  });
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  const status = err.status || 500;
  const code = err.code || (status === 500 ? "INTERNAL_ERROR" : "UNKNOWN_ERROR");
  const message = err.message || "Internal Server Error";

  if (process.env.NODE_ENV !== "production") {
    console.error("[ERROR]", status, code, message, err.stack);
  }

  res.status(status).json({
    ok: false,
    error: { code, message },
  });
});

module.exports = app;
