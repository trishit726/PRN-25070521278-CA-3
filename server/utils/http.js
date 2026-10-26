import { ActivityLog, Notification } from "../models/index.js";
export const ok = (res, data, status = 200, meta) =>
  res.status(status).json({ success: true, data, ...(meta ? { meta } : {}) });
export const fail = (res, status, message) =>
  res.status(status).json({ success: false, error: { message } });
export async function notify(userId, title, message, type, relatedEntityId) {
  if (userId)
    await Notification.create({
      userId,
      title,
      message,
      type,
      relatedEntityId,
    });
}
export async function logAction(
  user,
  action,
  entityType,
  entityId,
  description,
) {
  await ActivityLog.create({
    userId: user?._id,
    action,
    entityType,
    entityId,
    description,
  });
}
export const page = (req) => ({
  limit: Math.min(Math.max(Number(req.query.limit) || 20, 1), 100),
  skip:
    (Math.max(Number(req.query.page) || 1, 1) - 1) *
    Math.min(Math.max(Number(req.query.limit) || 20, 1), 100),
});
