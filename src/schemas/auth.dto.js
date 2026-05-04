const { z } = require("zod");

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().transform((v) => v.toLowerCase()),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase()),
  password: z.string().min(6),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6),
  confirmPassword: z.string().min(6),
}).refine((v) => v.newPassword === v.confirmPassword, {
  message: "Xac nhan mat khau khong khop",
  path: ["confirmPassword"],
}).refine((v) => v.currentPassword !== v.newPassword, {
  message: "Mat khau moi phai khac mat khau hien tai",
  path: ["newPassword"],
});

module.exports = { registerSchema, loginSchema, changePasswordSchema };
