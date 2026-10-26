import jwt from "jsonwebtoken";
import { User } from "../models/index.js";

export async function authenticate(req, res, next) {
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (!token)
      return res
        .status(401)
        .json({
          success: false,
          error: { message: "Authentication required" },
        });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user || !user.isActive)
      return res
        .status(401)
        .json({ success: false, error: { message: "Account unavailable" } });
    req.user = user;
    next();
  } catch {
    res
      .status(401)
      .json({
        success: false,
        error: { message: "Invalid or expired session" },
      });
  }
}

export const allow =
  (...roles) =>
  (req, res, next) =>
    roles.includes(req.user.role)
      ? next()
      : res
          .status(403)
          .json({
            success: false,
            error: { message: "Insufficient permissions" },
          });
