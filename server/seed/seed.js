import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import {
  User,
  Laboratory,
  Asset,
  Reservation,
  Maintenance,
} from "../models/index.js";

const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/labops";
const passwordHash = await bcrypt.hash("LabOpsDemo2026!", 12);
try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  const people = [
    ["Admin User", "admin@labops.demo", "admin"],
    ["Taylor Morgan", "technician@labops.demo", "technician"],
    ["Jordan Lee", "tech2@labops.demo", "technician"],
    ["Sam Student", "student@labops.demo", "student"],
    ["Avery Patel", "student2@labops.demo", "student"],
    ["Casey Kim", "student3@labops.demo", "student"],
  ];
  for (const [name, email, role] of people)
    await User.updateOne(
      { email },
      {
        $setOnInsert: {
          name,
          email,
          role,
          department:
            role === "student" ? "Computer Science" : "Science Operations",
          passwordHash,
          isActive: true,
        },
      },
      { upsert: true },
    );
  const users = await User.find({ email: { $in: people.map((p) => p[1]) } });
  const byEmail = Object.fromEntries(users.map((u) => [u.email, u]));
  const labsData = [
    ["Computing Lab", "LAB-COMP", "Computer Science", "Block A · Room 201"],
    [
      "Electronics Lab",
      "LAB-ELEC",
      "Electrical Engineering",
      "Block B · Room 105",
    ],
    ["Biology Lab", "LAB-BIO", "Life Sciences", "Block C · Room 302"],
  ];
  for (const [name, code, department, location] of labsData) {
    const tech =
      code === "LAB-BIO"
        ? byEmail["tech2@labops.demo"]
        : byEmail["technician@labops.demo"];
    await Laboratory.updateOne(
      { code },
      {
        $setOnInsert: {
          name,
          code,
          department,
          location,
          description: `${department} teaching and research facility`,
          technicianIds: [tech._id],
          isActive: true,
        },
      },
      { upsert: true },
    );
  }
  const labs = await Laboratory.find({
    code: { $in: labsData.map((l) => l[1]) },
  });
  const catalog = [
    ["Dell OptiPlex Workstation", "Computer", "Computing Lab"],
    ["HP Z2 Workstation", "Computer", "Computing Lab"],
    ["Lenovo ThinkStation", "Computer", "Computing Lab"],
    ["Cisco Catalyst Switch", "Networking", "Computing Lab"],
    ["Epson Projector", "Display", "Computing Lab"],
    ["Oscilloscope TBS1052B", "Test Equipment", "Electronics Lab"],
    ["Digital Multimeter", "Test Equipment", "Electronics Lab"],
    ["Bench Power Supply", "Power Supply", "Electronics Lab"],
    ["Soldering Station", "Tools", "Electronics Lab"],
    ["Function Generator", "Test Equipment", "Electronics Lab"],
    ["Arduino Mega Kit", "Microcontroller", "Electronics Lab"],
    ["Raspberry Pi Kit", "Microcontroller", "Electronics Lab"],
    ["Compound Microscope", "Microscope", "Biology Lab"],
    ["Centrifuge 5810", "Centrifuge", "Biology Lab"],
    ["Digital Balance", "Measurement", "Biology Lab"],
    ["Incubator 150L", "Incubator", "Biology Lab"],
    ["Autoclave Vertical", "Sterilization", "Biology Lab"],
    ["Refrigerated Centrifuge", "Centrifuge", "Biology Lab"],
    ["Spectrophotometer", "Analysis", "Biology Lab"],
    ["Water Bath", "Laboratory Equipment", "Biology Lab"],
  ];
  for (let i = 0; i < catalog.length; i++) {
    const [name, category, labName] = catalog[i];
    const lab = labs.find((l) => l.name === labName);
    const condition = i === 13 ? "damaged" : i === 6 ? "fair" : "good";
    const status = i === 13 ? "under_maintenance" : "available";
    await Asset.updateOne(
      { assetCode: `LO-${String(i + 1).padStart(4, "0")}` },
      {
        $setOnInsert: {
          name,
          serialNumber: `DEMO-SN-${String(i + 1).padStart(4, "0")}`,
          assetCode: `LO-${String(i + 1).padStart(4, "0")}`,
          category,
          laboratoryId: lab._id,
          manufacturer: i < 5 ? "LabOps Demo" : "Research Instruments",
          purchaseDate: new Date(2022 + (i % 4), i % 12, 12),
          condition,
          status,
          qrCodeId: randomUUID(),
          description: `${name} for supervised laboratory use.`,
        },
      },
      { upsert: true },
    );
  }
  const assets = await Asset.find({ assetCode: /^LO-/ }).sort({ assetCode: 1 });
  const maintenanceRows = [
    [
      "Keyboard keys not responding",
      "Replace the damaged keyboard.",
      "high",
      "pending",
    ],
    [
      "Centrifuge lid sensor error",
      "Sensor intermittently fails to detect lid lock.",
      "critical",
      "in_progress",
    ],
    [
      "Microscope illumination flicker",
      "LED illumination flickers under normal operation.",
      "medium",
      "pending",
    ],
    [
      "Power supply output drift",
      "Output measures 0.4V above setting.",
      "high",
      "in_progress",
    ],
    [
      "Projector remote missing",
      "Replacement remote requested.",
      "low",
      "resolved",
    ],
  ];
  for (let i = 0; i < maintenanceRows.length; i++) {
    const [title, description, priority, status] = maintenanceRows[i];
    const asset = assets[[0, 13, 12, 7, 4][i]];
    await Maintenance.updateOne(
      { title, assetId: asset._id },
      {
        $setOnInsert: {
          title,
          description,
          priority,
          status,
          assetId: asset._id,
          reportedBy: byEmail["student@labops.demo"]._id,
          assignedTo: byEmail["technician@labops.demo"]._id,
          ...(status === "resolved"
            ? {
                resolvedAt: new Date(),
                resolutionNotes: "Replaced and tested successfully.",
              }
            : {}),
        },
      },
      { upsert: true },
    );
  }
  const windows = [
    [-5, -4],
    [-2, -1],
    [2, 3],
    [5, 6],
    [9, 10],
  ];
  for (let i = 0; i < 5; i++) {
    const start = new Date();
    start.setDate(start.getDate() + windows[i][0]);
    start.setHours(10, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    end.setHours(12, 0, 0, 0);
    const status = ["approved", "completed", "pending", "rejected", "pending"][
      i
    ];
    await Reservation.updateOne(
      { purpose: `Demo reservation ${i + 1}` },
      {
        $setOnInsert: {
          assetId: assets[i]._id,
          userId:
            byEmail[
              [
                "student@labops.demo",
                "student2@labops.demo",
                "student3@labops.demo",
              ][i % 3]
            ]._id,
          startTime: start,
          endTime: end,
          purpose: `Demo reservation ${i + 1}: supervised coursework`,
          status,
          approvedBy:
            status === "approved" || status === "completed"
              ? byEmail["admin@labops.demo"]._id
              : undefined,
        },
      },
      { upsert: true },
    );
  }
  console.log(
    `Seed complete: ${labs.length} laboratories, ${assets.length} assets, ${users.length} users. Demo password: LabOpsDemo2026!`,
  );
} catch (error) {
  console.error(`Seed failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
