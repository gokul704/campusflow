import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { tenantResolver } from "./middleware/tenantResolver";
import { superAdminAuth } from "./middleware/superAdminAuth";
import { errorHandler } from "./middleware/errorHandler";
import { apiLimiter } from "./middleware/rateLimiter";
import authRoutes from "./modules/auth/auth.routes";
import usersRoutes from "./modules/users/users.routes";
import departmentsRoutes from "./modules/departments/departments.routes";
import batchesRoutes from "./modules/batches/batches.routes";
import coursesRoutes from "./modules/courses/courses.routes";
import studentsRoutes from "./modules/students/students.routes";
import facultyRoutes from "./modules/faculty/faculty.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";
import tenantsRoutes from "./modules/tenants/tenants.routes";
import batchCoursesRoutes from "./modules/batch-courses/batch-courses.routes";
import timetableRoutes from "./modules/timetable/timetable.routes";
import attendanceRoutes from "./modules/attendance/attendance.routes";
import assignmentsRoutes from "./modules/assignments/assignments.routes";
import feesRoutes from "./modules/fees/fees.routes";
import reportsRoutes from "./modules/reports/reports.routes";
import eventsRoutes from "./modules/events/events.routes";
import examGradesRoutes from "./modules/exam-grades/exam-grades.routes";
import notificationsRoutes from "./modules/notifications/notifications.routes";
import sectionsRoutes from "./modules/sections/sections.routes";

const app = express();
const PORT = process.env.PORT ?? 4000;

/** Production CORS: *.campusflow.io, *.onrender.com, *.vercel.app, localhost, and CORS_ORIGINS (comma-separated full origins). */
function productionCorsAllowed(origin: string | undefined): boolean {
  if (!origin) return true;
  let hostname: string;
  try {
    hostname = new URL(origin).hostname;
  } catch {
    return false;
  }
  if (hostname === "localhost" || hostname === "127.0.0.1") return true;
  if (/\.campusflow\.io$/i.test(hostname)) return true;
  if (hostname.endsWith(".onrender.com")) return true;
  if (hostname.endsWith(".vercel.app")) return true;
  const extras =
    process.env.CORS_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  return extras.includes(origin);
}

// ─── Global Middleware ───────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (process.env.NODE_ENV !== "production") {
        callback(null, true);
        return;
      }
      if (productionCorsAllowed(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  })
);
app.use(morgan("dev"));
app.use(express.json());
app.use("/api", apiLimiter);

// ─── Super-admin routes ───────────────────────────────────────────────────────
app.use("/api/super/tenants", superAdminAuth, tenantsRoutes);

// ─── Tenant-scoped routes ─────────────────────────────────────────────────────
app.use("/api", tenantResolver);
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/departments", departmentsRoutes);
app.use("/api/batches", batchesRoutes);
app.use("/api/courses", coursesRoutes);
app.use("/api/students", studentsRoutes);
app.use("/api/faculty", facultyRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/batch-courses", batchCoursesRoutes);
app.use("/api/timetable", timetableRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/assignments", assignmentsRoutes);
app.use("/api/fees", feesRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/exam-grades", examGradesRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/sections", sectionsRoutes);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (_, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use((_, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 CampusFlow API running on http://localhost:${PORT}`);
});
