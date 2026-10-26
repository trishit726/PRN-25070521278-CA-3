import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import QRCode from "qrcode";
import { z } from "zod";
import {
  User,
  Laboratory,
  Asset,
  Reservation,
  Maintenance,
  Notification,
  ActivityLog,
} from "../models/index.js";
import { authenticate, allow } from "../middleware/auth.js";
import { ok, fail, notify, logAction, page } from "../utils/http.js";

const router = Router();
const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
const validate = (schema) => (req, res, next) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success)
    return fail(
      res,
      400,
      parsed.error.issues.map((issue) => issue.message).join("; "),
    );
  req.body = parsed.data;
  next();
};
const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  department: z.string().optional(),
});
const assetSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  serialNumber: z.string().min(2),
  assetCode: z.string().min(2),
  category: z.string().min(2),
  laboratoryId: z.string(),
  manufacturer: z.string().optional(),
  purchaseDate: z.coerce.date().optional(),
  condition: z.enum(["good", "fair", "damaged"]).optional(),
  status: z.enum(["available", "under_maintenance", "retired"]).optional(),
});

router.post(
  "/auth/register",
  validate(registerSchema),
  wrap(async (req, res) => {
    const email = req.body.email.toLowerCase();
    if (await User.exists({ email }))
      return fail(res, 409, "An account with this email already exists");
    const user = await User.create({
      ...req.body,
      email,
      passwordHash: await bcrypt.hash(req.body.password, 12),
      role: "student",
    });
    return ok(
      res,
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token: jwt.sign({ sub: user.id }, process.env.JWT_SECRET, {
          expiresIn: "12h",
        }),
      },
      201,
    );
  }),
);
router.post(
  "/auth/login",
  wrap(async (req, res) => {
    const parsed = z
      .object({ email: z.string().email(), password: z.string().min(1) })
      .safeParse(req.body);
    if (!parsed.success)
      return fail(res, 400, "Enter a valid email and password");
    const user = await User.findOne({
      email: parsed.data.email.toLowerCase(),
    }).select("+passwordHash");
    if (
      !user ||
      !user.isActive ||
      !(await bcrypt.compare(parsed.data.password, user.passwordHash))
    )
      return fail(res, 401, "Email or password is incorrect");
    const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, {
      expiresIn: "12h",
    });
    return ok(res, {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
      },
      token,
    });
  }),
);
router.use(authenticate);
router.get("/auth/me", (req, res) =>
  ok(res, {
    id: req.user.id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    department: req.user.department,
  }),
);
router.post("/auth/logout", (_req, res) => ok(res, { message: "Logged out" }));

router.get(
  "/labs",
  wrap(async (req, res) => {
    const filter =
      req.user.role === "technician" ? { technicianIds: req.user.id } : {};
    const labs = await Laboratory.find(filter)
      .populate("technicianIds", "name email")
      .lean();
    const counts = await Asset.aggregate([
      { $match: { status: { $ne: "retired" } } },
      { $group: { _id: "$laboratoryId", count: { $sum: 1 } } },
    ]);
    const byLab = new Map(counts.map((x) => [String(x._id), x.count]));
    ok(
      res,
      labs.map((l) => ({
        ...l,
        equipmentCount: byLab.get(String(l._id)) || 0,
      })),
    );
  }),
);
router.post(
  "/labs",
  allow("admin"),
  wrap(async (req, res) => {
    const lab = await Laboratory.create(req.body);
    await logAction(
      req.user,
      "created",
      "laboratory",
      lab.id,
      `Created laboratory ${lab.name}`,
    );
    ok(res, lab, 201);
  }),
);
router.patch(
  "/labs/:id",
  allow("admin"),
  wrap(async (req, res) => {
    const lab = await Laboratory.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!lab) return fail(res, 404, "Laboratory not found");
    await logAction(
      req.user,
      "updated",
      "laboratory",
      lab.id,
      `Updated laboratory ${lab.name}`,
    );
    ok(res, lab);
  }),
);
router.delete(
  "/labs/:id",
  allow("admin"),
  wrap(async (req, res) => {
    if (
      await Asset.exists({
        laboratoryId: req.params.id,
        status: { $ne: "retired" },
      })
    )
      return fail(
        res,
        409,
        "Retire or move active assets before deactivating this laboratory",
      );
    const lab = await Laboratory.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true },
    );
    if (!lab) return fail(res, 404, "Laboratory not found");
    await logAction(
      req.user,
      "deactivated",
      "laboratory",
      lab.id,
      `Deactivated laboratory ${lab.name}`,
    );
    ok(res, lab);
  }),
);

router.get(
  "/assets",
  wrap(async (req, res) => {
    const { limit, skip } = page(req);
    const filter = {};
    if (req.query.search)
      filter.$or = [
        { name: new RegExp(req.query.search, "i") },
        { serialNumber: new RegExp(req.query.search, "i") },
        { assetCode: new RegExp(req.query.search, "i") },
      ];
    if (req.query.laboratoryId) filter.laboratoryId = req.query.laboratoryId;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.status) filter.status = req.query.status;
    if (req.user.role === "technician") {
      const labs = await Laboratory.find({
        technicianIds: req.user.id,
      }).distinct("_id");
      filter.laboratoryId = { $in: labs };
    }
    const [items, total] = await Promise.all([
      Asset.find(filter)
        .populate("laboratoryId", "name code")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Asset.countDocuments(filter),
    ]);
    ok(res, items, 200, { total, page: Math.floor(skip / limit) + 1, limit });
  }),
);
router.post(
  "/assets",
  allow("admin", "technician"),
  validate(assetSchema),
  wrap(async (req, res) => {
    const lab = await Laboratory.findById(req.body.laboratoryId);
    if (!lab) return fail(res, 400, "Laboratory not found");
    if (
      req.user.role === "technician" &&
      !lab.technicianIds.some((id) => id.equals(req.user.id))
    )
      return fail(res, 403, "Laboratory is not assigned to you");
    const asset = await Asset.create({
      ...req.body,
      ...(req.body.condition === "damaged"
        ? { status: "under_maintenance" }
        : {}),
      qrCodeId: crypto.randomUUID(),
    });
    await logAction(
      req.user,
      "created",
      "asset",
      asset.id,
      `Added asset ${asset.name}`,
    );
    ok(res, asset, 201);
  }),
);
router.get(
  "/assets/qr/:qrCodeId",
  wrap(async (req, res) => {
    const asset = await Asset.findOne({ qrCodeId: req.params.qrCodeId })
      .populate("laboratoryId")
      .lean();
    if (!asset) return fail(res, 404, "Asset not found");
    if (
      req.user.role === "technician" &&
      !asset.laboratoryId.technicianIds.some((id) => id.equals(req.user.id))
    )
      return fail(res, 403, "Laboratory is not assigned to you");
    ok(res, asset);
  }),
);
router.get(
  "/assets/:id/qr",
  wrap(async (req, res) => {
    const a = await Asset.findById(req.params.id);
    if (!a) return fail(res, 404, "Asset not found");
    ok(res, {
      qrCodeId: a.qrCodeId,
      dataUrl: await QRCode.toDataURL(
        `${process.env.CLIENT_ORIGIN || "http://localhost:5173"}/assets/qr/${a.qrCodeId}`,
      ),
    });
  }),
);
router.get(
  "/assets/:id",
  wrap(async (req, res) => {
    const asset = await Asset.findById(req.params.id)
      .populate("laboratoryId", "name code technicianIds")
      .lean();
    if (!asset) return fail(res, 404, "Asset not found");
    if (
      req.user.role === "technician" &&
      !asset.laboratoryId.technicianIds.some((id) => id.equals(req.user.id))
    )
      return fail(res, 403, "Laboratory is not assigned to you");
    const [maintenance, reservations] = await Promise.all([
      Maintenance.find({
        assetId: asset.id,
        ...(req.user.role === "student" ? { reportedBy: req.user.id } : {}),
      })
        .populate("reportedBy assignedTo", "name")
        .sort({ createdAt: -1 })
        .lean(),
      Reservation.find({
        assetId: asset.id,
        ...(req.user.role === "student" ? { userId: req.user.id } : {}),
      })
        .populate("userId", "name")
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
    ]);
    delete asset.laboratoryId.technicianIds;
    ok(res, { ...asset, maintenance, reservations });
  }),
);
router.patch(
  "/assets/:id",
  allow("admin", "technician"),
  wrap(async (req, res) => {
    const asset = await Asset.findById(req.params.id).populate("laboratoryId");
    if (!asset) return fail(res, 404, "Asset not found");
    if (req.user.role === "technician") {
      if (
        !asset.laboratoryId.technicianIds.some((id) => id.equals(req.user.id))
      )
        return fail(res, 403, "Laboratory is not assigned to you");
      if ("laboratoryId" in req.body || "status" in req.body)
        return fail(res, 403, "Technicians cannot move or retire equipment");
    }
    const fields = z
      .object({
        name: z.string().min(2).optional(),
        description: z.string().optional(),
        category: z.string().min(2).optional(),
        manufacturer: z.string().optional(),
        purchaseDate: z.coerce.date().optional(),
        condition: z.enum(["good", "fair", "damaged"]).optional(),
        status: z
          .enum(["available", "under_maintenance", "retired"])
          .optional(),
        laboratoryId: z.string().optional(),
      })
      .strict()
      .safeParse(req.body);
    if (!fields.success) return fail(res, 400, "Invalid equipment update");
    Object.assign(asset, fields.data);
    await asset.save();
    await logAction(
      req.user,
      "updated",
      "asset",
      asset.id,
      `Updated asset ${asset.name}`,
    );
    ok(res, asset);
  }),
);
router.delete(
  "/assets/:id",
  allow("admin"),
  wrap(async (req, res) => {
    const a = await Asset.findByIdAndUpdate(
      req.params.id,
      { status: "retired" },
      { new: true },
    );
    a ? ok(res, a) : fail(res, 404, "Asset not found");
    if (a)
      await logAction(
        req.user,
        "retired",
        "asset",
        a.id,
        `Retired asset ${a.name}`,
      );
  }),
);

router.get(
  "/reservations",
  wrap(async (req, res) => {
    const f = req.user.role === "student" ? { userId: req.user.id } : {};
    if (req.user.role === "technician") {
      const labs = await Laboratory.find({
        technicianIds: req.user.id,
      }).distinct("_id");
      const assetIds = await Asset.find({
        laboratoryId: { $in: labs },
      }).distinct("_id");
      f.assetId = { $in: assetIds };
    }
    ok(
      res,
      await Reservation.find(f)
        .populate("assetId userId approvedBy")
        .sort({ createdAt: -1 })
        .lean(),
    );
  }),
);
router.get(
  "/reservations/:id",
  wrap(async (req, res) => {
    const r = await Reservation.findById(req.params.id)
      .populate("assetId userId approvedBy")
      .lean();
    if (!r) return fail(res, 404, "Reservation not found");
    if (req.user.role === "student" && !r.userId._id.equals(req.user.id))
      return fail(res, 403, "You cannot view this reservation");
    if (req.user.role === "technician") {
      const lab = await Laboratory.findById(r.assetId.laboratoryId);
      if (!lab?.technicianIds.some((id) => id.equals(req.user.id)))
        return fail(res, 403, "Laboratory is not assigned to you");
    }
    ok(res, r);
  }),
);
router.post(
  "/reservations",
  wrap(async (req, res) => {
    const p = z
      .object({
        assetId: z.string(),
        startTime: z.coerce.date(),
        endTime: z.coerce.date(),
        purpose: z.string().min(5),
      })
      .safeParse(req.body);
    if (!p.success)
      return fail(res, 400, "Provide an asset, purpose, and valid time range");
    const { assetId, startTime, endTime, purpose } = p.data;
    if (startTime <= new Date() || endTime <= startTime)
      return fail(res, 400, "End time must be after a future start time");
    const asset = await Asset.findById(assetId);
    if (!asset || asset.status !== "available")
      return fail(res, 409, "This equipment is not available for reservation");
    if (
      await Reservation.exists({
        assetId,
        status: { $in: ["pending", "approved"] },
        startTime: { $lt: endTime },
        endTime: { $gt: startTime },
      })
    )
      return fail(res, 409, "This time conflicts with another reservation");
    const r = await Reservation.create({
      assetId,
      userId: req.user.id,
      startTime,
      endTime,
      purpose,
    });
    const admins = await User.find({ role: "admin", isActive: true }).select(
      "_id",
    );
    await Promise.all(
      admins.map((a) =>
        notify(
          a.id,
          "Reservation request",
          `${req.user.name} requested ${asset.name}`,
          "reservation",
          r.id,
        ),
      ),
    );
    ok(res, await r.populate("assetId userId"), 201);
  }),
);
router.patch(
  "/reservations/:id/status",
  allow("admin"),
  wrap(async (req, res) => {
    const { status } = req.body;
    if (!["approved", "rejected", "completed"].includes(status))
      return fail(res, 400, "Invalid reservation status");
    const r = await Reservation.findById(req.params.id).populate("assetId");
    if (!r) return fail(res, 404, "Reservation not found");
    if (status === "approved") {
      if (r.assetId.status !== "available")
        return fail(res, 409, "Equipment is not reservable");
      if (
        await Reservation.exists({
          _id: { $ne: r.id },
          assetId: r.assetId.id,
          status: { $in: ["pending", "approved"] },
          startTime: { $lt: r.endTime },
          endTime: { $gt: r.startTime },
        })
      )
        return fail(
          res,
          409,
          "This reservation now conflicts with another request",
        );
    }
    r.status = status;
    r.approvedBy = req.user.id;
    await r.save();
    await notify(
      r.userId,
      "Reservation updated",
      `Your reservation was ${status}`,
      "reservation",
      r.id,
    );
    await logAction(
      req.user,
      status,
      "reservation",
      r.id,
      `Reservation ${status}`,
    );
    ok(res, r);
  }),
);
router.patch(
  "/reservations/:id/cancel",
  wrap(async (req, res) => {
    const r = await Reservation.findById(req.params.id);
    if (!r) return fail(res, 404, "Reservation not found");
    if (req.user.role !== "admin" && !r.userId.equals(req.user.id))
      return fail(res, 403, "You cannot cancel this reservation");
    if (!["pending", "approved"].includes(r.status))
      return fail(res, 409, "Reservation cannot be cancelled");
    r.status = "cancelled";
    await r.save();
    ok(res, r);
  }),
);

router.get(
  "/maintenance",
  wrap(async (req, res) => {
    const f = {};
    if (req.user.role === "student") f.reportedBy = req.user.id;
    if (req.user.role === "technician") {
      const labs = await Laboratory.find({
        technicianIds: req.user.id,
      }).distinct("_id");
      const assets = await Asset.find({ laboratoryId: { $in: labs } }).distinct(
        "_id",
      );
      f.$or = [
        { assignedTo: req.user.id },
        { assetId: { $in: assets }, assignedTo: null },
      ];
    }
    ok(
      res,
      await Maintenance.find(f)
        .populate("assetId reportedBy assignedTo")
        .sort({ createdAt: -1 })
        .lean(),
    );
  }),
);
router.post(
  "/maintenance",
  wrap(async (req, res) => {
    const p = z
      .object({
        assetId: z.string(),
        title: z.string().min(3),
        description: z.string().min(5),
        priority: z
          .enum(["low", "medium", "high", "critical"])
          .default("medium"),
      })
      .safeParse(req.body);
    if (!p.success)
      return fail(res, 400, "Provide equipment, issue title, and description");
    const asset = await Asset.findById(p.data.assetId);
    if (!asset) return fail(res, 404, "Equipment not found");
    const m = await Maintenance.create({ ...p.data, reportedBy: req.user.id });
    asset.condition = "damaged";
    asset.status = "under_maintenance";
    await asset.save();
    const lab = await Laboratory.findById(asset.laboratoryId);
    await Promise.all(
      (lab?.technicianIds || []).map((id) =>
        notify(
          id,
          "Maintenance reported",
          `${asset.name}: ${m.title}`,
          "maintenance",
          m.id,
        ),
      ),
    );
    ok(res, m, 201);
  }),
);
router.get(
  "/maintenance/:id",
  wrap(async (req, res) => {
    const m = await Maintenance.findById(req.params.id)
      .populate("assetId reportedBy assignedTo")
      .lean();
    if (!m) return fail(res, 404, "Maintenance request not found");
    if (req.user.role === "student" && !m.reportedBy._id.equals(req.user.id))
      return fail(res, 403, "You cannot view this maintenance report");
    if (req.user.role === "technician") {
      const lab = await Laboratory.findById(m.assetId.laboratoryId);
      if (!lab?.technicianIds.some((id) => id.equals(req.user.id)))
        return fail(res, 403, "Laboratory is not assigned to you");
    }
    ok(res, m);
  }),
);
router.patch(
  "/maintenance/:id",
  allow("admin", "technician"),
  wrap(async (req, res) => {
    const m = await Maintenance.findById(req.params.id).populate("assetId");
    if (!m) return fail(res, 404, "Maintenance request not found");
    if (req.user.role === "technician") {
      const lab = await Laboratory.findById(m.assetId.laboratoryId);
      if (!lab.technicianIds.some((id) => id.equals(req.user.id)))
        return fail(res, 403, "Laboratory is not assigned to you");
      if (req.body.assignedTo && req.body.assignedTo !== req.user.id)
        return fail(
          res,
          403,
          "Technicians cannot assign requests to other users",
        );
    }
    const p = z
      .object({
        status: z
          .enum(["pending", "in_progress", "resolved", "rejected"])
          .optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
        assignedTo: z.string().optional(),
        resolutionNotes: z.string().optional(),
      })
      .strict()
      .safeParse(req.body);
    if (!p.success) return fail(res, 400, "Invalid maintenance update");
    const priorAssignee = String(m.assignedTo || "");
    Object.assign(m, p.data);
    if (p.data.status === "resolved") {
      m.resolvedAt = new Date();
      m.assetId.status = "available";
      m.assetId.condition = "good";
      await m.assetId.save();
    }
    if (p.data.status) m.assignedTo = m.assignedTo || req.user.id;
    await m.save();
    if (p.data.assignedTo && priorAssignee !== p.data.assignedTo)
      await notify(
        p.data.assignedTo,
        "Maintenance assigned",
        `You were assigned: ${m.title}`,
        "maintenance",
        m.id,
      );
    await notify(
      m.reportedBy,
      "Maintenance updated",
      `Your report “${m.title}” is ${m.status}`,
      "maintenance",
      m.id,
    );
    await logAction(
      req.user,
      m.status,
      "maintenance",
      m.id,
      `Maintenance ${m.status}: ${m.title}`,
    );
    ok(res, m);
  }),
);

router.get(
  "/notifications",
  wrap(async (req, res) =>
    ok(
      res,
      await Notification.find({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
    ),
  ),
);
router.patch(
  "/notifications/:id/read",
  wrap(async (req, res) => {
    const n = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { isRead: true },
      { new: true },
    );
    n ? ok(res, n) : fail(res, 404, "Notification not found");
  }),
);
router.get(
  "/users",
  allow("admin"),
  wrap(async (req, res) =>
    ok(
      res,
      await User.find().select("-passwordHash").sort({ createdAt: -1 }).lean(),
    ),
  ),
);
router.post(
  "/users",
  allow("admin"),
  wrap(async (req, res) => {
    const p = z
      .object({
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(8),
        role: z.enum(["technician", "admin"]),
        department: z.string().optional(),
      })
      .safeParse(req.body);
    if (!p.success) return fail(res, 400, "Invalid user details");
    if (await User.exists({ email: p.data.email.toLowerCase() }))
      return fail(res, 409, "Email already exists");
    const u = await User.create({
      ...p.data,
      email: p.data.email.toLowerCase(),
      passwordHash: await bcrypt.hash(p.data.password, 12),
    });
    await logAction(
      req.user,
      "created",
      "user",
      u.id,
      `Created ${u.role} ${u.email}`,
    );
    ok(res, { id: u.id, name: u.name, email: u.email, role: u.role }, 201);
  }),
);
router.patch(
  "/users/:id",
  allow("admin"),
  wrap(async (req, res) => {
    if (
      req.params.id === req.user.id &&
      req.body.role &&
      req.body.role !== "admin"
    )
      return fail(res, 400, "Invalid self role change");
    const p = z
      .object({
        role: z.enum(["student", "technician", "admin"]).optional(),
        isActive: z.boolean().optional(),
        department: z.string().optional(),
      })
      .safeParse(req.body);
    if (!p.success) return fail(res, 400, "Invalid user update");
    const u = await User.findByIdAndUpdate(req.params.id, p.data, {
      new: true,
      runValidators: true,
    }).select("-passwordHash");
    u ? ok(res, u) : fail(res, 404, "User not found");
  }),
);

router.get(
  "/analytics/overview",
  allow("admin"),
  wrap(async (req, res) => {
    const [
      totalAssets,
      availableAssets,
      maintenanceAssets,
      pendingReservations,
      totalLaboratories,
      totalUsers,
      recentActivity,
    ] = await Promise.all([
      Asset.countDocuments(),
      Asset.countDocuments({ status: "available" }),
      Asset.countDocuments({ status: "under_maintenance" }),
      Reservation.countDocuments({ status: "pending" }),
      Laboratory.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: true }),
      ActivityLog.find()
        .populate("userId", "name")
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
    ]);
    ok(res, {
      totalAssets,
      availableAssets,
      maintenanceAssets,
      pendingReservations,
      totalLaboratories,
      totalUsers,
      recentActivity,
    });
  }),
);
router.get(
  "/analytics/assets",
  allow("admin"),
  wrap(async (req, res) => {
    const [byLab, byCondition] = await Promise.all([
      Asset.aggregate([
        { $group: { _id: "$laboratoryId", count: { $sum: 1 } } },
        {
          $lookup: {
            from: "laboratories",
            localField: "_id",
            foreignField: "_id",
            as: "lab",
          },
        },
        { $unwind: { path: "$lab", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            name: { $ifNull: ["$lab.name", "Unassigned"] },
            count: 1,
          },
        },
      ]),
      Asset.aggregate([{ $group: { _id: "$condition", count: { $sum: 1 } } }]),
    ]);
    ok(res, { byLab, byCondition });
  }),
);
router.get(
  "/analytics/maintenance",
  allow("admin"),
  wrap(async (req, res) => {
    const rows = await Maintenance.aggregate([
      {
        $group: {
          _id: {
            month: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            status: "$status",
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.month": 1 } },
    ]);
    ok(res, rows);
  }),
);
router.get(
  "/analytics/reservations",
  allow("admin"),
  wrap(async (req, res) => {
    const [stats, top] = await Promise.all([
      Reservation.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Reservation.aggregate([
        { $group: { _id: "$assetId", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "assets",
            localField: "_id",
            foreignField: "_id",
            as: "asset",
          },
        },
        { $unwind: "$asset" },
        { $project: { name: "$asset.name", count: 1 } },
      ]),
    ]);
    ok(res, { stats, top });
  }),
);
router.get(
  "/activity",
  allow("admin"),
  wrap(async (req, res) =>
    ok(
      res,
      await ActivityLog.find()
        .populate("userId", "name")
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
    ),
  ),
);
export default router;
