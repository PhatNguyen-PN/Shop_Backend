const { z } = require("zod");

const createAdminSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().transform((v) => v.toLowerCase()),
  password: z.string().min(6),
});

const updateUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().transform((v) => v.toLowerCase()),
  role: z.enum(["user", "admin"]),
});

const resetPasswordSchema = z.object({
  password: z.string().min(6),
});

module.exports = { createAdminSchema, updateUserSchema, resetPasswordSchema };
