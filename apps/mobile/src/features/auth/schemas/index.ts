import { z } from "zod";
import { password } from "@quickpay/contracts";
export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1, "Enter your password."),
});
export const resetSchema = z
  .object({ newPassword: password, confirmPassword: z.string() })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Your passwords do not match.",
  });
export const changePasswordSchema = resetSchema.safeExtend({
  currentPassword: z.string().min(1, "Enter your current password."),
});
