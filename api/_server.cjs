var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server/firebase.ts
var firebase_exports = {};
__export(firebase_exports, {
  db: () => db,
  firebaseAuth: () => firebaseAuth,
  getFirebaseApp: () => getFirebaseApp
});
function loadCredentials() {
  if (serviceAccountB64) {
    try {
      return JSON.parse(Buffer.from(serviceAccountB64, "base64").toString("utf8"));
    } catch {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_B64 is set but is not valid base64-encoded JSON.");
    }
  }
  if (serviceAccountRaw) {
    try {
      return JSON.parse(serviceAccountRaw);
    } catch {
      throw new Error("FIREBASE_SERVICE_ACCOUNT is set but not valid JSON.");
    }
  }
  const credentialsPath = serviceAccountPath || (fs.existsSync(defaultServiceAccountPath) ? defaultServiceAccountPath : void 0);
  if (credentialsPath) {
    if (!fs.existsSync(credentialsPath)) {
      throw new Error(`Service-account file not found at ${credentialsPath}`);
    }
    try {
      return JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
    } catch {
      throw new Error(`FIREBASE_SERVICE_ACCOUNT_PATH is set but not valid JSON: ${credentialsPath}`);
    }
  }
  throw new Error(
    "Firebase Admin credentials missing. Set FIREBASE_SERVICE_ACCOUNT (JSON), FIREBASE_SERVICE_ACCOUNT_B64 (base64), or FIREBASE_SERVICE_ACCOUNT_PATH."
  );
}
function loadAdminModule(subpath) {
  const spec = ["firebase-admin", subpath].filter(Boolean).join("/");
  return require(spec);
}
function getFirebase() {
  if (!app) {
    const adminApp = loadAdminModule("app");
    const { initializeApp, cert, getApps } = adminApp;
    const existing = getApps();
    app = existing.length === 0 ? initializeApp({ credential: cert(loadCredentials()) }) : existing[0];
  }
  return app;
}
function getFirebaseApp() {
  return getFirebase();
}
var fs, path, serviceAccountB64, serviceAccountRaw, serviceAccountPath, defaultServiceAccountPath, app, dbInstance, firebaseAuth, db;
var init_firebase = __esm({
  "server/firebase.ts"() {
    fs = __toESM(require("fs"), 1);
    path = __toESM(require("path"), 1);
    serviceAccountB64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
    serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
    serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    defaultServiceAccountPath = path.resolve(
      process.cwd(),
      "hossammansourweb-9489f-firebase-adminsdk-fbsvc-1b0dbe2bbd.json"
    );
    firebaseAuth = () => {
      const { getAuth } = loadAdminModule("auth");
      return getAuth(getFirebase());
    };
    db = () => {
      if (dbInstance) return dbInstance;
      const adminFirestore = loadAdminModule("firestore");
      const { initializeFirestore, getFirestore } = adminFirestore;
      try {
        dbInstance = initializeFirestore(getFirebase(), {});
        try {
          dbInstance.settings({ ignoreUndefinedProperties: true });
        } catch {
        }
      } catch {
        dbInstance = getFirestore(getFirebase());
        try {
          dbInstance.settings({ ignoreUndefinedProperties: true });
        } catch {
        }
      }
      return dbInstance;
    };
  }
});

// server.ts
var server_exports = {};
__export(server_exports, {
  app: () => app2,
  authenticateToken: () => authenticateToken,
  requireRoles: () => requireRoles
});
module.exports = __toCommonJS(server_exports);
var import_config = require("dotenv/config");
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);

// server/db.ts
init_firebase();
var faFirestoreMod = /* @__PURE__ */ (() => {
  let mod;
  return () => {
    if (!mod) {
      const spec = ["firebase-admin", "firestore"].join("/");
      mod = require(spec);
    }
    return mod;
  };
})();
var timestamp = () => faFirestoreMod().FieldValue.serverTimestamp();
var writeAny = faFirestoreMod().FieldValue;
var COL = {
  users: "users",
  branches: "branches",
  services: "services",
  appointments: "appointments",
  workingHours: "workingHours",
  exceptions: "scheduleExceptions",
  doctorProfile: "doctorProfile",
  reviews: "reviews",
  faqs: "faqs",
  announcements: "announcements",
  auditLogs: "auditLogs",
  notifications: "notifications",
  prescriptions: "prescriptions"
};
var DOCTOR_PROFILE_DOC_ID = "main";
function stripUndefined(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== void 0)
  );
}
function toIso(value) {
  if (!value) return (/* @__PURE__ */ new Date()).toISOString();
  if (value instanceof faFirestoreMod().Timestamp) {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string") return value;
  return (/* @__PURE__ */ new Date()).toISOString();
}
var ClinicDatabase = class {
  // Audit Logger
  async logAudit(userId, userName, userRole, action, entityType, entityId, details) {
    await db().collection(COL.auditLogs).add({
      userId,
      userName,
      userRole,
      action,
      entityType,
      entityId,
      details,
      timestamp: timestamp()
    });
  }
  // ----------------- USERS -----------------
  async getUsers() {
    const snap = await db().collection(COL.users).get();
    return snap.docs.map((d) => {
      const data = d.data();
      const { passwordHash: _omit, ...safe } = data;
      return safe;
    });
  }
  async findUserById(id) {
    const doc = await db().collection(COL.users).doc(id).get();
    if (!doc.exists) return null;
    return doc.data();
  }
  async findUserByPhoneOrEmail(identifier) {
    const clean = identifier.trim();
    const lower = clean.toLowerCase();
    const phoneQ = await db().collection(COL.users).where("phone", "==", clean).limit(1).get();
    if (!phoneQ.empty) return phoneQ.docs[0].data();
    const emailQ = await db().collection(COL.users).where("email", "==", lower).limit(1).get();
    if (!emailQ.empty) return emailQ.docs[0].data();
    return null;
  }
  async createUser(userData) {
    const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const baseUser = {
      id,
      name: userData.name,
      phone: userData.phone,
      email: userData.email,
      role: userData.role || "patient",
      gender: userData.gender,
      age: userData.age,
      passwordHash: "",
      // passwords live in Firebase Auth only
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const clean = stripUndefined(baseUser);
    await db().collection(COL.users).doc(id).set(clean);
    const { passwordHash: _omit, ...safe } = baseUser;
    return safe;
  }
  async createUserWithId(id, userData) {
    const baseUser = {
      id,
      name: userData.name,
      phone: userData.phone,
      email: userData.email,
      role: userData.role || "patient",
      gender: userData.gender,
      age: userData.age,
      passwordHash: "",
      // passwords live in Firebase Auth only
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const clean = stripUndefined(baseUser);
    await db().collection(COL.users).doc(id).set(clean);
    const { passwordHash: _omit, ...safe } = baseUser;
    return safe;
  }
  async updateUser(id, updates) {
    const ref = db().collection(COL.users).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    const clean = { ...updates };
    delete clean.id;
    const safeUpdates = stripUndefined(clean);
    await ref.update(safeUpdates);
    const fresh = await ref.get();
    const data = fresh.data();
    const { passwordHash: _omit, ...safe } = data;
    return safe;
  }
  // Soft delete a patient (deactivate account)
  async deactivatePatient(id) {
    const ref = db().collection(COL.users).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    await ref.update({ isActive: false, updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
    const fresh = await ref.get();
    return fresh.data();
  }
  // Hard delete a patient — removes the users/{uid} document. This is a destructive
  // operation: caller is responsible for deciding whether the patient is safe to
  // remove (e.g. already deactivated, or a guest that has never had an account).
  // We do NOT cascade delete the appointment history; appointments survive so the
  // booking record stays intact and reports remain accurate.
  async deletePatient(id) {
    const ref = db().collection(COL.users).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    const data = doc.data();
    if (data.role && data.role !== "patient") {
      throw new Error("\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u062D\u0633\u0627\u0628 \u0637\u0627\u0642\u0645 \u0637\u0628\u064A \u0645\u0646 \u0647\u0646\u0627.");
    }
    try {
      await firebaseAuth().deleteUser(id);
    } catch {
    }
    await ref.delete();
    return data;
  }
  // ----------------- PRESCRIPTIONS -----------------
  // Stored under users/{userId}/prescriptions/{id} — never world-readable and
  // only reachable by the owner (patient) or staff via the Admin SDK.
  // Serialize a raw Firestore doc into a Prescription, converting the
  // serverTimestamp fields into ISO strings for the client.
  toPrescription(id, data) {
    return {
      id,
      userId: data.userId,
      imageUrl: data.imageUrl,
      provider: data.provider,
      note: data.note || "",
      createdAt: toIso(data.createdAt),
      updatedAt: toIso(data.updatedAt)
    };
  }
  async getPrescriptions(userId) {
    const snap = await db().collection(COL.users).doc(userId).collection(COL.prescriptions).orderBy("createdAt", "desc").get();
    return snap.docs.map((d) => this.toPrescription(d.id, d.data()));
  }
  async createPrescription(userId, data) {
    const id = `rx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const payload = {
      id,
      userId,
      imageUrl: data.imageUrl,
      provider: data.provider,
      note: data.note || "",
      createdAt: timestamp(),
      updatedAt: timestamp()
    };
    await db().collection(COL.users).doc(userId).collection(COL.prescriptions).doc(id).set(payload);
    return {
      id,
      userId,
      imageUrl: data.imageUrl,
      provider: data.provider,
      note: data.note || "",
      createdAt: now,
      updatedAt: now
    };
  }
  async findPrescription(userId, id) {
    const doc = await db().collection(COL.users).doc(userId).collection(COL.prescriptions).doc(id).get();
    if (!doc.exists) return null;
    return this.toPrescription(doc.id, doc.data());
  }
  async deletePrescription(userId, id) {
    const ref = db().collection(COL.users).doc(userId).collection(COL.prescriptions).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return false;
    await ref.delete();
    return true;
  }
  // Admin: every prescription across all patients, joined with the owner's
  // profile so the dashboard can show who uploaded it.
  async getAllPrescriptions() {
    const snap = await db().collectionGroup(COL.prescriptions).get();
    const items = snap.docs.map((d) => this.toPrescription(d.id, d.data()));
    items.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    const userIds = Array.from(new Set(items.map((i) => i.userId)));
    const users = await Promise.all(userIds.map((uid) => this.findUserById(uid)));
    const userMap = new Map(users.filter(Boolean).map((u) => [u.id, u]));
    return items.map((i) => {
      const u = userMap.get(i.userId);
      return {
        ...i,
        patientName: u?.name || "\u0645\u0631\u064A\u0636 \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641",
        patientEmail: u?.email,
        patientPhone: u?.phone || ""
      };
    });
  }
  // ----------------- BRANCHES -----------------
  async getBranches(includeInactive = false) {
    const snap = await db().collection(COL.branches).get();
    return snap.docs.map((d) => d.data()).filter((b) => includeInactive || b.isActive).sort((a, b) => (a.order || 0) - (b.order || 0));
  }
  async findBranchById(id) {
    const doc = await db().collection(COL.branches).doc(id).get();
    return doc.exists ? doc.data() : null;
  }
  async createBranch(branch) {
    const id = `br_${Date.now()}`;
    const newBranch = { ...branch, id };
    await db().collection(COL.branches).doc(id).set(newBranch);
    return newBranch;
  }
  async updateBranch(id, updates) {
    const ref = db().collection(COL.branches).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    const clean = { ...updates };
    delete clean.id;
    await ref.update(clean);
    const fresh = await ref.get();
    return fresh.data();
  }
  async deleteBranch(id) {
    const ref = db().collection(COL.branches).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return false;
    await ref.delete();
    return true;
  }
  // ----------------- SERVICES -----------------
  async getServices(includeUnapproved = false) {
    const snap = await db().collection(COL.services).get();
    return snap.docs.map((d) => d.data()).filter((s) => includeUnapproved || s.isApproved && s.isVisible).sort((a, b) => (a.order || 0) - (b.order || 0));
  }
  async findServiceById(id) {
    const doc = await db().collection(COL.services).doc(id).get();
    return doc.exists ? doc.data() : null;
  }
  async createService(service) {
    const id = `srv_${Date.now()}`;
    const newService = { ...service, id };
    await db().collection(COL.services).doc(id).set(newService);
    return newService;
  }
  async updateService(id, updates) {
    const ref = db().collection(COL.services).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    const clean = { ...updates };
    delete clean.id;
    await ref.update(clean);
    const fresh = await ref.get();
    return fresh.data();
  }
  async deleteService(id) {
    const ref = db().collection(COL.services).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return false;
    await ref.delete();
    return true;
  }
  // ----------------- WORKING HOURS & EXCEPTIONS -----------------
  async getWorkingHours(branchId) {
    let q = db().collection(COL.workingHours);
    if (branchId) q = q.where("branchId", "==", branchId);
    const snap = await q.get();
    return snap.docs.map((d) => d.data());
  }
  async updateWorkingHour(id, updates) {
    const ref = db().collection(COL.workingHours).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    const clean = { ...updates };
    delete clean.id;
    await ref.update(clean);
    const fresh = await ref.get();
    return fresh.data();
  }
  async getExceptions(branchId) {
    let q = db().collection(COL.exceptions);
    if (branchId) q = q.where("branchId", "==", branchId);
    const snap = await q.get();
    return snap.docs.map((d) => d.data());
  }
  async createException(exception) {
    const id = `ex_${Date.now()}`;
    const newEx = { ...exception, id };
    await db().collection(COL.exceptions).doc(id).set(newEx);
    return newEx;
  }
  async deleteException(id) {
    const ref = db().collection(COL.exceptions).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return false;
    await ref.delete();
    return true;
  }
  async updateException(id, updates) {
    const ref = db().collection(COL.exceptions).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    const clean = { ...updates };
    delete clean.id;
    await ref.update(clean);
    const fresh = await ref.get();
    return fresh.data();
  }
  // ----------------- AVAILABLE SLOTS -----------------
  async calculateAvailableSlots(branchId, serviceId, dateStr) {
    const dateObj = /* @__PURE__ */ new Date(dateStr + "T00:00:00");
    if (isNaN(dateObj.getTime())) return [];
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(dateObj);
    targetDate.setHours(0, 0, 0, 0);
    if (targetDate < today) return [];
    const dayOfWeek = dateObj.getDay();
    const excSnap = await db().collection(COL.exceptions).where("branchId", "==", branchId).where("date", "==", dateStr).limit(1).get();
    const exception = excSnap.empty ? null : excSnap.docs[0].data();
    if (exception && (exception.type === "holiday" || exception.type === "off_day")) {
      return [];
    }
    const ruleSnap = await db().collection(COL.workingHours).where("branchId", "==", branchId).where("dayOfWeek", "==", dayOfWeek).limit(1).get();
    const rule = ruleSnap.empty ? null : ruleSnap.docs[0].data();
    if (!rule || !rule.isOpen) return [];
    let startTimeStr = rule.startTime;
    let endTimeStr = rule.endTime;
    if (exception && exception.type === "special_hours" && exception.startTime && exception.endTime) {
      startTimeStr = exception.startTime;
      endTimeStr = exception.endTime;
    }
    const service = serviceId ? await this.findServiceById(serviceId) : null;
    const slotDuration = service ? service.durationMinutes : rule.slotDurationMinutes || 20;
    const gap = rule.gapMinutes || 5;
    const parseMins = (t) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };
    const formatMins = (mins) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
    };
    const startMins = parseMins(startTimeStr);
    const endMins = parseMins(endTimeStr);
    const bookingsSnap = await db().collection(COL.appointments).where("appointmentDate", "==", dateStr).get();
    const existingBookings = bookingsSnap.docs.map((d) => d.data()).filter((apt) => apt.branchId === branchId && apt.status !== "cancelled");
    const breaks = rule.breaks || [];
    const slots = [];
    let currentMins = startMins;
    while (currentMins + slotDuration <= endMins) {
      const slotTimeStr = formatMins(currentMins);
      const inBreak = breaks.some((b) => {
        const bStart = parseMins(b.startTime);
        const bEnd = parseMins(b.endTime);
        return currentMins >= bStart && currentMins < bEnd;
      });
      if (inBreak) {
        currentMins += slotDuration + gap;
        continue;
      }
      const isBooked = existingBookings.some((apt) => apt.appointmentTime === slotTimeStr);
      slots.push({
        time: slotTimeStr,
        isAvailable: !isBooked,
        reason: isBooked ? "\u0645\u062D\u062C\u0648\u0632" : void 0
      });
      currentMins += slotDuration + gap;
    }
    return slots;
  }
  /**
   * Returns the YYYY-MM-DD strings (in the server's local timezone) for the next
   * `daysAhead` days that have at least one bookable appointment slot at the given
   * branch. Reuses calculateAvailableSlots so all working-hours, holiday,
   * exception, and existing-booking rules stay in one place.
   */
  async getAvailableDates(branchId, serviceId, daysAhead = 14) {
    if (!branchId) return [];
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    const available = [];
    for (let i = 0; i < daysAhead; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${day}`;
      try {
        const slots = await this.calculateAvailableSlots(branchId, serviceId || "", dateStr);
        if (slots.some((s) => s.isAvailable)) {
          available.push(dateStr);
        }
      } catch (e) {
        continue;
      }
    }
    return available;
  }
  // ----------------- APPOINTMENTS -----------------
  async getAppointments(filters) {
    const snap = await db().collection(COL.appointments).get();
    let list = snap.docs.map((d) => d.data());
    if (filters) {
      if (filters.patientId) {
        list = list.filter((a) => a.patientId === filters.patientId);
      }
      if (filters.branchId && filters.branchId !== "all") {
        list = list.filter((a) => a.branchId === filters.branchId);
      }
      if (filters.serviceId && filters.serviceId !== "all") {
        list = list.filter((a) => a.serviceId === filters.serviceId);
      }
      if (filters.status && filters.status !== "all") {
        list = list.filter((a) => a.status === filters.status);
      }
      if (filters.dateFrom) {
        list = list.filter((a) => (a.appointmentDate || "") >= filters.dateFrom);
      }
      if (filters.dateTo) {
        list = list.filter((a) => (a.appointmentDate || "") <= filters.dateTo);
      }
      if (filters.search) {
        const s = filters.search.toLowerCase().trim();
        list = list.filter(
          (a) => (a.bookingNumber || "").toLowerCase().includes(s) || (a.patientName || "").toLowerCase().includes(s) || (a.patientPhone || "").includes(s)
        );
      }
    }
    return list.sort((a, b) => {
      const adA = a.appointmentDate || "";
      const adB = b.appointmentDate || "";
      if (adA === adB) {
        return (a.appointmentTime || "").localeCompare(b.appointmentTime || "");
      }
      return adB.localeCompare(adA);
    });
  }
  async findAppointmentById(id) {
    const doc = await db().collection(COL.appointments).doc(id).get();
    return doc.exists ? doc.data() : null;
  }
  async findAppointmentByBookingNumber(bookingNumber) {
    const normalized = bookingNumber.toLowerCase().trim();
    const snap = await db().collection(COL.appointments).where("bookingNumber_lower", "==", normalized).limit(1).get();
    if (snap.empty) return null;
    return snap.docs[0].data();
  }
  async createAppointment(data) {
    const conflictQ = await db().collection(COL.appointments).where("branchId", "==", data.branchId).where("appointmentDate", "==", data.appointmentDate).where("appointmentTime", "==", data.appointmentTime).limit(1).get();
    const hasConflict = conflictQ.docs.some(
      (d) => d.data().status !== "cancelled"
    );
    if (hasConflict) {
      throw new Error("\u0647\u0630\u0627 \u0627\u0644\u0645\u0648\u0639\u062F \u062A\u0645 \u062D\u062C\u0632\u0647 \u0628\u0627\u0644\u0641\u0639\u0644 \u0644\u0645\u0631\u064A\u0636 \u0622\u062E\u0631\u060C \u064A\u0631\u062C\u0649 \u0627\u062E\u062A\u064A\u0627\u0631 \u0645\u0648\u0639\u062F \u0622\u062E\u0631 \u0645\u062A\u0627\u062D.");
    }
    const [service, branch] = await Promise.all([
      this.findServiceById(data.serviceId),
      this.findBranchById(data.branchId)
    ]);
    const randomDigits = Math.floor(1e5 + Math.random() * 9e5);
    const bookingNumber = `HM-${randomDigits}`;
    const id = `apt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const newAppointment = {
      id,
      bookingNumber,
      bookingNumber_lower: bookingNumber.toLowerCase(),
      patientId: data.patientId,
      patientName: data.patientName.trim(),
      patientPhone: data.patientPhone.trim(),
      patientEmail: data.patientEmail?.trim(),
      patientAge: data.patientAge,
      patientGender: data.patientGender || "male",
      serviceId: data.serviceId,
      serviceName: service?.name || "\u0627\u0633\u062A\u0634\u0627\u0631\u0629 \u0639\u0638\u0627\u0645",
      branchId: data.branchId,
      branchName: branch?.name || "\u0627\u0644\u0639\u064A\u0627\u062F\u0629",
      appointmentDate: data.appointmentDate,
      appointmentTime: data.appointmentTime,
      confirmationMethod: data.confirmationMethod || "whatsapp",
      status: "new",
      notes: data.notes?.trim(),
      createdAt: nowIso,
      updatedAt: nowIso
    };
    await db().collection(COL.appointments).doc(id).set(stripUndefined(newAppointment));
    await this.createNotification({
      appointmentId: newAppointment.id,
      recipientPhone: newAppointment.patientPhone,
      recipientEmail: newAppointment.patientEmail,
      type: "booking_confirmation",
      channel: newAppointment.confirmationMethod === "sms" ? "sms" : "whatsapp",
      content: `\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u062D\u062C\u0632\u0643 \u0628\u0646\u062C\u0627\u062D \u0641\u064A \u0639\u064A\u0627\u062F\u0629 \u062F. \u062D\u0633\u0627\u0645 \u0645\u0646\u0635\u0648\u0631 \u0628\u0631\u0642\u0645 (${bookingNumber}) \u0628\u062A\u0627\u0631\u064A\u062E ${newAppointment.appointmentDate} \u0627\u0644\u0633\u0627\u0639\u0629 ${newAppointment.appointmentTime} \u0628\u0640 ${newAppointment.branchName}.`
    });
    return newAppointment;
  }
  async updateAppointmentStatus(id, status, reason, internalNotes) {
    const ref = db().collection(COL.appointments).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    const apt = doc.data();
    const updates = { status, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
    if (reason) updates.cancellationReason = reason;
    if (internalNotes !== void 0) updates.clinicInternalNotes = internalNotes;
    await ref.update(updates);
    const fresh = (await ref.get()).data();
    if (status === "confirmed") {
      await this.createNotification({
        appointmentId: apt.id,
        recipientPhone: apt.patientPhone,
        ...apt.patientEmail ? { recipientEmail: apt.patientEmail } : {},
        type: "booking_confirmation",
        channel: apt.confirmationMethod === "sms" ? "sms" : "whatsapp",
        content: `\u062A\u0645 \u062A\u0623\u0643\u064A\u062F \u0645\u0648\u0639\u062F\u0643 \u0631\u0633\u0645\u064A\u0627\u064B \u0641\u064A \u0639\u064A\u0627\u062F\u0629 \u062F. \u062D\u0633\u0627\u0645 \u0645\u0646\u0635\u0648\u0631 \u0628\u0631\u0642\u0645 (${apt.bookingNumber}) \u0641\u064A ${apt.branchName} \u064A\u0648\u0645 ${apt.appointmentDate} \u0641\u064A \u062A\u0645\u0627\u0645 ${apt.appointmentTime}. \u0646\u062A\u0634\u0631\u0641 \u0628\u062E\u062F\u0645\u062A\u0643\u0645.`
      });
    } else if (status === "cancelled") {
      await this.createNotification({
        appointmentId: apt.id,
        recipientPhone: apt.patientPhone,
        ...apt.patientEmail ? { recipientEmail: apt.patientEmail } : {},
        type: "cancellation",
        channel: apt.confirmationMethod === "sms" ? "sms" : "whatsapp",
        content: `\u062A\u0645 \u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u0645\u0648\u0639\u062F \u0631\u0642\u0645 (${apt.bookingNumber}) \u0641\u064A \u0639\u064A\u0627\u062F\u0629 \u062F. \u062D\u0633\u0627\u0645 \u0645\u0646\u0635\u0648\u0631 \u0628\u0646\u0627\u0621\u064B \u0639\u0644\u0649 \u0637\u0644\u0628\u0643\u0645/\u0627\u0644\u0625\u062F\u0627\u0631\u0629. \u0633\u0628\u0628 \u0627\u0644\u0625\u0644\u063A\u0627\u0621: ${reason || "\u0628\u0646\u0627\u0621 \u0639\u0644\u0649 \u0631\u063A\u0628\u0629 \u0627\u0644\u0645\u0631\u064A\u0636"}.`
      });
    }
    return fresh;
  }
  async rescheduleAppointment(id, newDate, newTime, newBranchId) {
    const ref = db().collection(COL.appointments).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    const apt = doc.data();
    const targetBranchId = newBranchId || apt.branchId;
    const conflictQ = await db().collection(COL.appointments).where("branchId", "==", targetBranchId).where("appointmentDate", "==", newDate).where("appointmentTime", "==", newTime).get();
    const conflict = conflictQ.docs.find(
      (d) => d.id !== id && d.data().status !== "cancelled"
    );
    if (conflict) {
      throw new Error("\u0627\u0644\u0645\u0648\u0639\u062F \u0627\u0644\u062C\u062F\u064A\u062F \u0627\u0644\u0645\u062E\u062A\u0627\u0631 \u0645\u062D\u062C\u0648\u0632 \u0628\u0627\u0644\u0641\u0639\u0644\u060C \u064A\u0631\u062C\u0649 \u0627\u062E\u062A\u064A\u0627\u0631 \u0645\u0648\u0639\u062F \u0622\u062E\u0631.");
    }
    const branch = await this.findBranchById(targetBranchId);
    const updates = {
      branchId: targetBranchId,
      branchName: branch?.name || apt.branchName,
      appointmentDate: newDate,
      appointmentTime: newTime,
      status: "confirmed",
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    await ref.update(updates);
    const fresh = (await ref.get()).data();
    await this.createNotification({
      appointmentId: apt.id,
      recipientPhone: apt.patientPhone,
      recipientEmail: apt.patientEmail,
      type: "reschedule",
      channel: apt.confirmationMethod === "sms" ? "sms" : "whatsapp",
      content: `\u062A\u0645 \u062A\u0639\u062F\u064A\u0644 \u0645\u0648\u0639\u062F\u0643 \u0641\u064A \u0639\u064A\u0627\u062F\u0629 \u062F. \u062D\u0633\u0627\u0645 \u0645\u0646\u0635\u0648\u0631 \u0625\u0644\u0649 \u064A\u0648\u0645 ${newDate} \u0627\u0644\u0633\u0627\u0639\u0629 ${newTime} \u0641\u064A ${fresh.branchName}. \u0631\u0642\u0645 \u0627\u0644\u062D\u062C\u0632: ${apt.bookingNumber}.`
    });
    return fresh;
  }
  async deleteAppointment(id) {
    const ref = db().collection(COL.appointments).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    const apt = doc.data();
    await ref.delete();
    return apt;
  }
  // ----------------- DASHBOARD STATS -----------------
  async getDashboardStats() {
    const [appointments, branches, patients] = await Promise.all([
      this.getAppointments(),
      this.getBranches(true),
      this.getUsers()
    ]);
    const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const now = /* @__PURE__ */ new Date();
    const day = now.getDay();
    const diffToWeekStart = (day + 1) % 7;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - diffToWeekStart);
    weekStart.setHours(0, 0, 0, 0);
    const weekStartStr = weekStart.toISOString().split("T")[0];
    const todayBookings = appointments.filter((a) => a.appointmentDate === todayStr).length;
    const weeklyBookings = appointments.filter((a) => a.appointmentDate >= weekStartStr).length;
    const newBookings = appointments.filter((a) => a.status === "new").length;
    const confirmedBookings = appointments.filter((a) => a.status === "confirmed").length;
    const cancelledBookings = appointments.filter((a) => a.status === "cancelled").length;
    const completedBookings = appointments.filter((a) => a.status === "completed").length;
    const checkedInBookings = appointments.filter((a) => a.status === "checked_in").length;
    const noShowBookings = appointments.filter((a) => a.status === "no_show").length;
    const uniquePatients = new Set(appointments.map((a) => a.patientPhone)).size;
    const totalResolved = completedBookings + checkedInBookings + noShowBookings;
    const attendanceRate = totalResolved > 0 ? Math.round((completedBookings + checkedInBookings) / totalResolved * 100) : 94;
    const branchBreakdown = branches.map((b) => ({
      branchName: b.name,
      count: appointments.filter((a) => a.branchId === b.id).length
    }));
    return {
      todayBookings,
      weeklyBookings,
      newBookings,
      confirmedBookings,
      cancelledBookings,
      completedBookings,
      totalPatients: uniquePatients || patients.filter((u) => u.role === "patient").length,
      attendanceRate,
      branchBreakdown
    };
  }
  // ----------------- CONTENT (Doctor Profile, FAQs, Reviews, Announcements) -----------------
  async getDoctorProfile() {
    const doc = await db().collection(COL.doctorProfile).doc(DOCTOR_PROFILE_DOC_ID).get();
    if (!doc.exists) {
      const empty = {
        name: "",
        title: "",
        militaryTitle: "",
        bio: "",
        fullBiography: [],
        specialties: [],
        experiences: [],
        patientCareApproach: [],
        consultationFeeNote: "",
        isApproved: false,
        lastUpdatedBy: "",
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await db().collection(COL.doctorProfile).doc(DOCTOR_PROFILE_DOC_ID).set(empty);
      return empty;
    }
    return doc.data();
  }
  async updateDoctorProfile(profile, updatedBy) {
    const ref = db().collection(COL.doctorProfile).doc(DOCTOR_PROFILE_DOC_ID);
    const current = (await ref.get()).data();
    const merged = {
      ...current || {},
      ...profile,
      lastUpdatedBy: updatedBy,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    await ref.set(merged);
    return merged;
  }
  async getReviews(includeUnapproved = false) {
    const snap = await db().collection(COL.reviews).get();
    return snap.docs.map((d) => d.data()).filter((r) => includeUnapproved || r.isApproved).sort((a, b) => (a.order || 0) - (b.order || 0));
  }
  async createReview(review) {
    const id = `rev_${Date.now()}`;
    const newReview = { ...review, id, createdAt: (/* @__PURE__ */ new Date()).toISOString() };
    await db().collection(COL.reviews).doc(id).set(newReview);
    return newReview;
  }
  async updateReviewApproval(id, isApproved, isFeatured = false) {
    const ref = db().collection(COL.reviews).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    await ref.update({ isApproved, isFeatured });
    return (await ref.get()).data();
  }
  async deleteReview(id) {
    const ref = db().collection(COL.reviews).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return false;
    await ref.delete();
    return true;
  }
  async getFaqs(includeUnapproved = false) {
    const snap = await db().collection(COL.faqs).get();
    return snap.docs.map((d) => d.data()).filter((f) => includeUnapproved || f.isApproved).sort((a, b) => (a.order || 0) - (b.order || 0));
  }
  async createFaq(faq) {
    const id = `faq_${Date.now()}`;
    const newFaq = { ...faq, id, createdAt: (/* @__PURE__ */ new Date()).toISOString() };
    await db().collection(COL.faqs).doc(id).set(newFaq);
    return newFaq;
  }
  async updateFaq(id, updates) {
    const ref = db().collection(COL.faqs).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    const clean = { ...updates };
    delete clean.id;
    await ref.update(clean);
    return (await ref.get()).data();
  }
  async deleteFaq(id) {
    const ref = db().collection(COL.faqs).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return false;
    await ref.delete();
    return true;
  }
  async getAnnouncements(activeOnly = true) {
    const snap = await db().collection(COL.announcements).get();
    return snap.docs.map((d) => d.data()).filter((a) => !activeOnly || a.isActive);
  }
  async createAnnouncement(data) {
    const id = `anc_${Date.now()}`;
    const newAnc = {
      ...data,
      id,
      createdAt: data.createdAt || (/* @__PURE__ */ new Date()).toISOString()
    };
    const clean = Object.fromEntries(
      Object.entries(newAnc).filter(([, v]) => v !== void 0)
    );
    await db().collection(COL.announcements).doc(id).set(clean);
    return newAnc;
  }
  async updateAnnouncement(id, updates) {
    const ref = db().collection(COL.announcements).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    const clean = { ...updates };
    delete clean.id;
    await ref.update(clean);
    return (await ref.get()).data();
  }
  // ----------------- AUDIT LOGS & NOTIFICATIONS -----------------
  async getNotifications(limit = 100) {
    const snap = await db().collection(COL.notifications).orderBy("createdAt", "desc").limit(limit).get();
    return snap.docs.map((d) => {
      const data = d.data();
      return { ...data, id: d.id, createdAt: toIso(data.createdAt) };
    });
  }
  async createNotification(data) {
    const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const record = {
      ...data,
      id,
      status: "delivered",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const cleanRecord = Object.fromEntries(
      Object.entries(record).filter(([, value]) => value !== void 0)
    );
    await db().collection(COL.notifications).doc(id).set(cleanRecord);
    return cleanRecord;
  }
  // ----------------- CMS HELPERS -----------------
  async updateReview(id, updates) {
    const ref = db().collection(COL.reviews).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    const clean = { ...updates };
    delete clean.id;
    await ref.update(clean);
    const fresh = await ref.get();
    return { ...fresh.data(), id: fresh.id };
  }
  async deleteAnnouncement(id) {
    const ref = db().collection(COL.announcements).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return false;
    await ref.delete();
    return true;
  }
  // ----------------- FIREBASE AUTH HELPERS (server-side) -----------------
  async createAuthUser(opts) {
    const userRecord = await firebaseAuth().createUser({
      email: opts.email,
      password: opts.password,
      displayName: opts.displayName
    });
    return userRecord.uid;
  }
  async setAuthUserRole(uid, role) {
    await firebaseAuth().setCustomUserClaims(uid, { role });
  }
  // ----------------- ADMIN USER MANAGEMENT -----------------
  async deleteUser(id) {
    const ref = db().collection(COL.users).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    const data = doc.data();
    try {
      await firebaseAuth().deleteUser(id);
    } catch {
    }
    await ref.delete();
    return data;
  }
};
var db2 = new ClinicDatabase();

// server.ts
var app2 = (0, import_express.default)();
var PORT = Number(process.env.PORT) || 3e3;
var BODY_LIMIT = process.env.VERCEL ? "4mb" : "20mb";
app2.use(import_express.default.json({ limit: BODY_LIMIT }));
app2.use(import_express.default.urlencoded({ extended: true, limit: BODY_LIMIT }));
app2.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});
async function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ success: false, message: "\u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0623\u0648\u0644\u0627\u064B \u0644\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u0647\u0630\u0647 \u0627\u0644\u062E\u062F\u0645\u0629." });
  }
  try {
    const { firebaseAuth: firebaseAuth2 } = await Promise.resolve().then(() => (init_firebase(), firebase_exports));
    const decoded = await firebaseAuth2().verifyIdToken(token);
    let user = null;
    const found = await db2.findUserById(decoded.uid);
    if (found) {
      const { passwordHash: _omit, ...safe } = found;
      user = safe;
    }
    if (!user) {
      const email = decoded.email || void 0;
      const name = decoded.name || (email ? email.split("@")[0] : "\u0645\u0633\u062A\u062E\u062F\u0645 \u062C\u062F\u064A\u062F");
      user = await db2.createUserWithId(decoded.uid, {
        name,
        phone: "",
        email,
        password: "",
        role: "patient"
      });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: "\u0627\u0646\u062A\u0647\u062A \u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0644\u062C\u0644\u0633\u0629\u060C \u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0645\u062C\u062F\u062F\u0627\u064B." });
  }
}
function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D." });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "\u0644\u064A\u0633 \u0644\u062F\u064A\u0643 \u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0627\u062A \u0627\u0644\u0643\u0627\u0641\u064A\u0629 \u0644\u062A\u0646\u0641\u064A\u0630 \u0647\u0630\u0627 \u0627\u0644\u0625\u062C\u0631\u0627\u0621." });
    }
    next();
  };
}
var wrap = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res)).catch(next);
};
async function uploadToImageHost(dataUrl) {
  const match = /^data:(image\/\w+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error("\u0635\u064A\u063A\u0629 \u0627\u0644\u0635\u0648\u0631\u0629 \u063A\u064A\u0631 \u0645\u062F\u0639\u0648\u0645\u0629.");
  const base64 = match[2];
  const imgbbKey = process.env.IMG_BB_API_KEY;
  if (imgbbKey) {
    try {
      const body = new URLSearchParams();
      body.append("image", base64);
      const resp = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(imgbbKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString()
      });
      const json = await resp.json().catch(() => null);
      if (json && json.success && json.data && json.data.url) {
        return { url: json.data.url, provider: "imgbb" };
      }
    } catch (err) {
      console.warn("[imgbb] upload failed, attempting fallback:", err.message);
    }
  }
  const freeKey = process.env.FREE_IMAGE_API_KEY;
  if (freeKey) {
    try {
      const body = new URLSearchParams();
      body.append("key", freeKey);
      body.append("action", "upload");
      body.append("source", base64);
      const resp = await fetch("https://freeimage.host/api/1/upload", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString()
      });
      const json = await resp.json().catch(() => null);
      const url = json?.data?.image?.url || json?.data?.url || json?.image?.url || json?.data?.medium && json.data.medium.url;
      if (url) return { url, provider: "freeimage" };
    } catch (err) {
      console.warn("[freeimage] upload failed:", err.message);
    }
  }
  throw new Error(
    imgbbKey || freeKey ? "\u062A\u0639\u0630\u0631 \u0631\u0641\u0639 \u0627\u0644\u0635\u0648\u0631\u0629 \u0625\u0644\u0649 \u062E\u0627\u062F\u0645 \u0627\u0644\u0635\u0648\u0631. \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649." : "\u062E\u062F\u0645\u0629 \u0631\u0641\u0639 \u0627\u0644\u0635\u0648\u0631 \u063A\u064A\u0631 \u0645\u0647\u064A\u0623\u0629 \u0639\u0644\u0649 \u0627\u0644\u062E\u0627\u062F\u0645."
  );
}
app2.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
app2.get("/api/public/clinic-info", wrap(async (req, res) => {
  const [branches, services, doctorProfile, reviews, faqs, announcements] = await Promise.all([
    db2.getBranches(false),
    db2.getServices(false),
    db2.getDoctorProfile(),
    db2.getReviews(false),
    db2.getFaqs(false),
    db2.getAnnouncements(true)
  ]);
  res.json({
    success: true,
    data: {
      branches,
      services,
      doctorProfile,
      reviews,
      faqs,
      announcements
    }
  });
}));
app2.get("/api/public/available-slots", wrap(async (req, res) => {
  const { branchId, serviceId, date } = req.query;
  if (!branchId || !date) {
    return res.status(400).json({ success: false, message: "\u064A\u0631\u062C\u0649 \u062A\u062D\u062F\u064A\u062F \u0627\u0644\u0641\u0631\u0639 \u0648\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u062D\u062C\u0632." });
  }
  const slots = await db2.calculateAvailableSlots(branchId, serviceId || "", date);
  res.json({ success: true, data: slots });
}));
app2.get("/api/public/available-dates", wrap(async (req, res) => {
  const { branchId, serviceId, daysAhead } = req.query;
  if (!branchId) {
    return res.status(400).json({ success: false, message: "\u064A\u0631\u062C\u0649 \u062A\u062D\u062F\u064A\u062F \u0627\u0644\u0641\u0631\u0639." });
  }
  const days = Math.min(60, Math.max(1, parseInt(daysAhead || "14", 10) || 14));
  const dates = await db2.getAvailableDates(branchId, serviceId || "", days);
  res.json({ success: true, data: dates });
}));
app2.post("/api/public/appointments/book", wrap(async (req, res) => {
  const {
    patientName,
    patientPhone,
    patientEmail,
    patientAge,
    patientGender,
    serviceId,
    branchId,
    appointmentDate,
    appointmentTime,
    confirmationMethod,
    notes
  } = req.body;
  if (!patientName || !patientPhone || !serviceId || !branchId || !appointmentDate || !appointmentTime) {
    return res.status(400).json({ success: false, message: "\u064A\u0631\u062C\u0649 \u0625\u0643\u0645\u0627\u0644 \u062C\u0645\u064A\u0639 \u0627\u0644\u062D\u0642\u0648\u0644 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629 \u0644\u0644\u062D\u062C\u0632." });
  }
  const phoneRegex = /^01[0125][0-9]{8}$/;
  const cleanPhone = patientPhone.trim().replace(/\s+/g, "");
  if (!phoneRegex.test(cleanPhone)) {
    return res.status(400).json({ success: false, message: "\u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0631\u0642\u0645 \u0647\u0627\u062A\u0641 \u0645\u0635\u0631\u064A \u0635\u062D\u064A\u062D (\u0645\u062B\u0627\u0644: 01100171817)." });
  }
  let patientId = void 0;
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token) {
    try {
      const { firebaseAuth: firebaseAuth2 } = await Promise.resolve().then(() => (init_firebase(), firebase_exports));
      const decoded = await firebaseAuth2().verifyIdToken(token);
      if (decoded?.uid) patientId = decoded.uid;
    } catch (e) {
    }
  }
  if (!patientId) {
    const existingUser = await db2.findUserByPhoneOrEmail(cleanPhone);
    if (existingUser) {
      patientId = existingUser.id;
    }
  }
  const appointment = await db2.createAppointment({
    patientId,
    patientName,
    patientPhone: cleanPhone,
    patientEmail,
    patientAge: patientAge ? Number(patientAge) : void 0,
    patientGender,
    serviceId,
    branchId,
    appointmentDate,
    appointmentTime,
    confirmationMethod,
    notes
  });
  await db2.logAudit(
    patientId || "anonymous_patient",
    patientName,
    "patient",
    "CREATE_APPOINTMENT",
    "Appointment",
    appointment.id,
    `\u062D\u062C\u0632 \u0645\u0648\u0639\u062F \u0643\u0634\u0641 \u062C\u062F\u064A\u062F \u0628\u0631\u0642\u0645 ${appointment.bookingNumber} \u0641\u064A ${appointment.branchName} \u0628\u062A\u0627\u0631\u064A\u062E ${appointment.appointmentDate} \u0627\u0644\u0633\u0627\u0639\u0629 ${appointment.appointmentTime}`
  );
  res.status(201).json({
    success: true,
    message: "\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0645\u0648\u0639\u062F \u0627\u0644\u0643\u0634\u0641 \u0628\u0646\u062C\u0627\u062D.",
    data: appointment
  });
}));
app2.get("/api/public/appointments/lookup", wrap(async (req, res) => {
  const { bookingNumber, phone } = req.query;
  if (!bookingNumber || !phone) {
    return res.status(400).json({ success: false, message: "\u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0631\u0642\u0645 \u0627\u0644\u062D\u062C\u0632 \u0648\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641 \u0627\u0644\u0645\u0633\u062C\u0644." });
  }
  const appointment = await db2.findAppointmentByBookingNumber(bookingNumber);
  if (!appointment || appointment.patientPhone.replace(/\s+/g, "") !== phone.replace(/\s+/g, "")) {
    return res.status(404).json({ success: false, message: "\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u062D\u062C\u0632 \u064A\u0637\u0627\u0628\u0642 \u0647\u0630\u0647 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A." });
  }
  res.json({ success: true, data: appointment });
}));
app2.post("/api/public/reviews/submit", wrap(async (req, res) => {
  const { patientName, rating, reviewText, treatmentType } = req.body;
  if (!patientName || !rating || !reviewText) {
    return res.status(400).json({ success: false, message: "\u064A\u0631\u062C\u0649 \u0643\u062A\u0627\u0628\u0629 \u0627\u0644\u0627\u0633\u0645 \u0648\u0627\u0644\u062A\u0642\u064A\u064A\u0645 \u0648\u0631\u0623\u064A\u0643\u0645." });
  }
  const review = await db2.createReview({
    patientName: patientName.trim(),
    rating: Math.min(5, Math.max(1, Number(rating))),
    reviewText: reviewText.trim(),
    treatmentType: treatmentType?.trim() || "\u0643\u0634\u0641 \u0648\u0627\u0633\u062A\u0634\u0627\u0631\u0629 \u0639\u0638\u0627\u0645",
    visitDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    isApproved: false,
    // Strict Admin approval requirement
    isFeatured: false,
    order: 10
  });
  await db2.logAudit(
    "anonymous_patient",
    patientName,
    "patient",
    "SUBMIT_REVIEW",
    "Review",
    review.id,
    `\u0625\u0631\u0633\u0627\u0644 \u062A\u0642\u064A\u064A\u0645 \u0645\u0631\u064A\u0636 \u062C\u062F\u064A\u062F \u0641\u064A \u0627\u0646\u062A\u0638\u0627\u0631 \u0645\u0648\u0627\u0641\u0642\u0629 \u0627\u0644\u0625\u062F\u0627\u0631\u0629.`
  );
  res.status(201).json({
    success: true,
    message: "\u0634\u0643\u0631\u0627\u064B \u0644\u0645\u0634\u0627\u0631\u0643\u062A\u0646\u0627 \u062A\u062C\u0631\u0628\u062A\u0643\u0645! \u0633\u064A\u062A\u0645 \u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u062A\u0642\u064A\u064A\u0645 \u0648\u0627\u0639\u062A\u0645\u0627\u062F\u0647 \u0645\u0646 \u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0639\u064A\u0627\u062F\u0629 \u0642\u0628\u0644 \u0627\u0644\u0646\u0634\u0631.",
    data: review
  });
}));
app2.post("/api/auth/register", wrap(async (req, res) => {
  const { name, phone, email, password, gender, age } = req.body;
  if (!name || !phone || !password) {
    return res.status(400).json({ success: false, message: "\u064A\u0631\u062C\u0649 \u0643\u062A\u0627\u0628\u0629 \u0627\u0644\u0627\u0633\u0645 \u0648\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641 \u0648\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631." });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u064A\u062C\u0628 \u0623\u0646 \u0644\u0627 \u062A\u0642\u0644 \u0639\u0646 6 \u0623\u062D\u0631\u0641 \u0623\u0648 \u0623\u0631\u0642\u0627\u0645." });
  }
  const cleanPhone = phone.trim().replace(/\s+/g, "");
  const existing = await db2.findUserByPhoneOrEmail(cleanPhone);
  if (existing) {
    return res.status(409).json({ success: false, message: "\u064A\u0648\u062C\u062F \u062D\u0633\u0627\u0628 \u0645\u0633\u062C\u0644 \u0628\u0627\u0644\u0641\u0639\u0644 \u0628\u0647\u0630\u0627 \u0627\u0644\u0631\u0642\u0645 \u0623\u0648 \u0627\u0644\u0628\u0631\u064A\u062F." });
  }
  const authEmail = email && email.trim() || `${cleanPhone}@hossam-clinic.local`;
  const { firebaseAuth: firebaseAuth2 } = await Promise.resolve().then(() => (init_firebase(), firebase_exports));
  try {
    await firebaseAuth2().getUserByEmail(authEmail);
    return res.status(409).json({ success: false, message: "\u064A\u0648\u062C\u062F \u062D\u0633\u0627\u0628 \u0645\u0631\u062A\u0628\u0637 \u0628\u0647\u0630\u0627 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0628\u0627\u0644\u0641\u0639\u0644." });
  } catch (e) {
    if (e?.code !== "auth/user-not-found") {
      throw e;
    }
  }
  let userRecord;
  try {
    userRecord = await firebaseAuth2().createUser({
      email: authEmail,
      password,
      displayName: name
    });
  } catch (e) {
    const code = e?.code || "";
    let friendly = "\u0641\u0634\u0644 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062D\u0633\u0627\u0628\u060C \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649.";
    if (code === "auth/email-already-exists") {
      friendly = "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0633\u062A\u062E\u062F\u0645 \u0628\u0627\u0644\u0641\u0639\u0644.";
    } else if (code === "auth/invalid-email") {
      friendly = "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u063A\u064A\u0631 \u0635\u0627\u0644\u062D.";
    } else if (code === "auth/invalid-password") {
      friendly = "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u064A\u062C\u0628 \u0623\u0646 \u0644\u0627 \u062A\u0642\u0644 \u0639\u0646 6 \u0623\u062D\u0631\u0641.";
    }
    return res.status(409).json({ success: false, message: friendly });
  }
  await firebaseAuth2().setCustomUserClaims(userRecord.uid, { role: "patient" });
  const user = await db2.createUserWithId(userRecord.uid, {
    name: name.trim(),
    phone: cleanPhone,
    email: email?.trim(),
    password,
    role: "patient",
    gender,
    age: age ? Number(age) : void 0
  });
  await db2.logAudit(userRecord.uid, user.name, user.role, "USER_REGISTER", "User", userRecord.uid, "\u062A\u0633\u062C\u064A\u0644 \u062D\u0633\u0627\u0628 \u0645\u0631\u064A\u0636 \u062C\u062F\u064A\u062F \u0628\u0627\u0644\u0645\u0646\u0635\u0629.");
  res.status(201).json({
    success: true,
    message: "\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062D\u0633\u0627\u0628 \u0628\u0646\u062C\u0627\u062D.",
    data: { user, token: "client-side-firebase-auth" }
  });
}));
app2.post("/api/auth/login", wrap(async (req, res) => {
  const { identifier } = req.body;
  if (!identifier) {
    return res.status(400).json({ success: false, message: "\u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641 / \u0627\u0644\u0628\u0631\u064A\u062F." });
  }
  const user = await db2.findUserByPhoneOrEmail(identifier);
  if (!user) {
    return res.status(404).json({ success: false, message: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062F\u062E\u0648\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629\u060C \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u0623\u0643\u062F \u0645\u0646 \u0627\u0644\u0631\u0642\u0645 \u0623\u0648 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631." });
  }
  res.json({
    success: true,
    message: "\u064A\u0631\u062C\u0649 \u0625\u0643\u0645\u0627\u0644 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0639\u0628\u0631 Firebase Auth \u0641\u064A \u0627\u0644\u0648\u0627\u062C\u0647\u0629.",
    data: { email: user.email || `${user.phone}@hossam-clinic.local`, user }
  });
}));
app2.get("/api/auth/me", authenticateToken, (req, res) => {
  res.json({ success: true, data: req.user });
});
app2.post("/api/auth/sync", wrap(async (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ success: false, message: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D." });
  }
  let decoded;
  try {
    const { firebaseAuth: firebaseAuth2 } = await Promise.resolve().then(() => (init_firebase(), firebase_exports));
    decoded = await firebaseAuth2().verifyIdToken(token);
  } catch {
    return res.status(403).json({ success: false, message: "\u0627\u0646\u062A\u0647\u062A \u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0644\u062C\u0644\u0633\u0629\u060C \u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0645\u062C\u062F\u062F\u0627\u064B." });
  }
  const uid = decoded.uid;
  const existing = await db2.findUserById(uid);
  if (existing) {
    return res.json({ success: true, data: existing });
  }
  const email = decoded.email || void 0;
  const name = decoded.name || (email ? email.split("@")[0] : "\u0645\u0633\u062A\u062E\u062F\u0645 Google");
  const newUser = await db2.createUserWithId(uid, {
    name,
    phone: "",
    email,
    password: "",
    role: "patient"
  });
  await db2.logAudit(newUser.id, newUser.name, newUser.role, "USER_GOOGLE_REGISTER", "User", newUser.id, "\u062A\u0633\u062C\u064A\u0644 \u062F\u062E\u0648\u0644 \u0639\u0628\u0631 Google (\u0645\u0631\u064A\u0636 \u062C\u062F\u064A\u062F).");
  res.status(201).json({ success: true, data: newUser });
}));
app2.post("/api/auth/forgot-password", wrap(async (req, res) => {
  const { identifier } = req.body;
  const user = await db2.findUserByPhoneOrEmail(identifier);
  if (!user) {
    return res.status(404).json({ success: false, message: "\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u062D\u0633\u0627\u0628 \u0645\u0631\u062A\u0628\u0637 \u0628\u0647\u0630\u0627 \u0627\u0644\u0631\u0642\u0645 \u0623\u0648 \u0627\u0644\u0628\u0631\u064A\u062F." });
  }
  const email = user.email || `${user.phone}@hossam-clinic.local`;
  const { firebaseAuth: firebaseAuth2 } = await Promise.resolve().then(() => (init_firebase(), firebase_exports));
  try {
    const link = await firebaseAuth2().generatePasswordResetLink(email);
    await db2.createNotification({
      recipientPhone: user.phone,
      recipientEmail: user.email,
      type: "reminder",
      channel: "sms",
      content: `\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0631\u0627\u0628\u0637 \u0627\u0633\u062A\u0639\u0627\u062F\u0629 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0644\u062D\u0633\u0627\u0628\u0643 \u0641\u064A \u0639\u064A\u0627\u062F\u0629 \u062F. \u062D\u0633\u0627\u0645 \u0645\u0646\u0635\u0648\u0631. \u0627\u0644\u0631\u0627\u0628\u0637: ${link}`
    });
  } catch (e) {
  }
  res.json({
    success: true,
    message: "\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0631\u0627\u0628\u0637 \u0627\u0633\u062A\u0639\u0627\u062F\u0629 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0625\u0644\u0649 \u0628\u0631\u064A\u062F\u0643 \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0627\u0644\u0645\u0633\u062C\u0644."
  });
}));
app2.get("/api/patient/appointments", authenticateToken, wrap(async (req, res) => {
  const user = req.user;
  const all = await db2.getAppointments();
  const appointments = all.filter(
    (a) => a.patientId === user.id || a.patientPhone === user.phone
  );
  res.json({ success: true, data: appointments });
}));
app2.post("/api/patient/appointments/:id/cancel", authenticateToken, wrap(async (req, res) => {
  const user = req.user;
  const apt = await db2.findAppointmentById(req.params.id);
  if (!apt) {
    return res.status(404).json({ success: false, message: "\u0627\u0644\u0645\u0648\u0639\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F." });
  }
  if (apt.patientId !== user.id && apt.patientPhone !== user.phone) {
    return res.status(403).json({ success: false, message: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u0625\u0644\u063A\u0627\u0621 \u0647\u0630\u0627 \u0627\u0644\u062D\u062C\u0632." });
  }
  if (apt.status === "completed" || apt.status === "checked_in") {
    return res.status(400).json({ success: false, message: "\u0644\u0627 \u064A\u0645\u0643\u0646 \u0625\u0644\u063A\u0627\u0621 \u0645\u0648\u0639\u062F \u062A\u0645 \u062D\u0636\u0648\u0631\u0647 \u0623\u0648 \u0625\u0643\u0645\u0627\u0644\u0647 \u0628\u0627\u0644\u0641\u0639\u0644." });
  }
  const { reason } = req.body;
  const updated = await db2.updateAppointmentStatus(apt.id, "cancelled", reason || "\u0625\u0644\u063A\u0627\u0621 \u0628\u0648\u0627\u0633\u0637\u0629 \u0627\u0644\u0645\u0631\u064A\u0636");
  await db2.logAudit(
    user.id,
    user.name,
    user.role,
    "PATIENT_CANCEL_APPOINTMENT",
    "Appointment",
    apt.id,
    `\u0642\u0627\u0645 \u0627\u0644\u0645\u0631\u064A\u0636 \u0628\u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u062D\u062C\u0632 \u0631\u0642\u0645 ${apt.bookingNumber}. \u0627\u0644\u0633\u0628\u0628: ${reason || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F"}`
  );
  res.json({ success: true, message: "\u062A\u0645 \u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u0645\u0648\u0639\u062F \u0628\u0646\u062C\u0627\u062D.", data: updated });
}));
app2.post("/api/patient/appointments/:id/reschedule", authenticateToken, wrap(async (req, res) => {
  const user = req.user;
  const apt = await db2.findAppointmentById(req.params.id);
  if (!apt) {
    return res.status(404).json({ success: false, message: "\u0627\u0644\u0645\u0648\u0639\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F." });
  }
  if (apt.patientId !== user.id && apt.patientPhone !== user.phone) {
    return res.status(403).json({ success: false, message: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u062A\u0639\u062F\u064A\u0644 \u0647\u0630\u0627 \u0627\u0644\u062D\u062C\u0632." });
  }
  const { newDate, newTime, newBranchId } = req.body;
  if (!newDate || !newTime) {
    return res.status(400).json({ success: false, message: "\u064A\u0631\u062C\u0649 \u062A\u062D\u062F\u064A\u062F \u0627\u0644\u062A\u0627\u0631\u064A\u062E \u0648\u0627\u0644\u0648\u0642\u062A \u0627\u0644\u062C\u062F\u064A\u062F\u064A\u0646." });
  }
  const updated = await db2.rescheduleAppointment(apt.id, newDate, newTime, newBranchId);
  await db2.logAudit(
    user.id,
    user.name,
    user.role,
    "PATIENT_RESCHEDULE_APPOINTMENT",
    "Appointment",
    apt.id,
    `\u0642\u0627\u0645 \u0627\u0644\u0645\u0631\u064A\u0636 \u0628\u062A\u0639\u062F\u064A\u0644 \u0645\u0648\u0639\u062F \u0627\u0644\u062D\u062C\u0632 \u0631\u0642\u0645 ${apt.bookingNumber} \u0625\u0644\u0649 ${newDate} \u0627\u0644\u0633\u0627\u0639\u0629 ${newTime}`
  );
  res.json({ success: true, message: "\u062A\u0645 \u062A\u0639\u062F\u064A\u0644 \u0645\u0648\u0639\u062F \u0627\u0644\u0643\u0634\u0641 \u0628\u0646\u062C\u0627\u062D.", data: updated });
}));
app2.put("/api/patient/profile", authenticateToken, wrap(async (req, res) => {
  const user = req.user;
  const { name, email, age, gender } = req.body;
  const updated = await db2.updateUser(user.id, {
    name: name?.trim() || user.name,
    email: email?.trim(),
    age: age ? Number(age) : user.age,
    gender: gender || user.gender
  });
  res.json({ success: true, message: "\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0634\u062E\u0635\u064A\u0629 \u0628\u0646\u062C\u0627\u062D.", data: updated });
}));
app2.get("/api/patient/prescriptions", authenticateToken, wrap(async (req, res) => {
  const user = req.user;
  const list = await db2.getPrescriptions(user.id);
  res.json({ success: true, data: list });
}));
app2.post("/api/patient/prescriptions", authenticateToken, wrap(async (req, res) => {
  const user = req.user;
  const { image, note } = req.body;
  if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
    return res.status(400).json({ success: false, message: "\u064A\u0631\u062C\u0649 \u0627\u062E\u062A\u064A\u0627\u0631 \u0635\u0648\u0631\u0629 \u0635\u062D\u064A\u062D\u0629 \u0644\u0644\u0631\u0648\u0634\u062A\u0629." });
  }
  if (image.length > 18 * 1024 * 1024) {
    return res.status(413).json({ success: false, message: "\u062D\u062C\u0645 \u0627\u0644\u0635\u0648\u0631\u0629 \u0643\u0628\u064A\u0631 \u062C\u062F\u0627\u064B. \u064A\u0631\u062C\u0649 \u0627\u062E\u062A\u064A\u0627\u0631 \u0635\u0648\u0631\u0629 \u0623\u0635\u063A\u0631." });
  }
  try {
    const { url, provider } = await uploadToImageHost(image);
    const rx = await db2.createPrescription(user.id, { imageUrl: url, provider, note: note || "" });
    await db2.logAudit(
      user.id,
      user.name,
      user.role,
      "PATIENT_CREATE_PRESCRIPTION",
      "Prescription",
      rx.id,
      `\u0642\u0627\u0645 \u0627\u0644\u0645\u0631\u064A\u0636 \u0628\u0625\u0636\u0627\u0641\u0629 \u0631\u0648\u0634\u062A\u0629 \u062C\u062F\u064A\u062F\u0629 (${provider}).`
    );
    res.json({ success: true, message: "\u062A\u0645 \u062D\u0641\u0638 \u0627\u0644\u0631\u0648\u0634\u062A\u0629 \u0628\u0646\u062C\u0627\u062D.", data: rx });
  } catch (err) {
    return res.status(502).json({ success: false, message: err?.message || "\u0641\u0634\u0644 \u0631\u0641\u0639 \u0627\u0644\u0635\u0648\u0631\u0629." });
  }
}));
app2.delete("/api/patient/prescriptions/:id", authenticateToken, wrap(async (req, res) => {
  const user = req.user;
  const rx = await db2.findPrescription(user.id, req.params.id);
  if (!rx) {
    return res.status(404).json({ success: false, message: "\u0627\u0644\u0631\u0648\u0634\u062A\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629." });
  }
  await db2.deletePrescription(user.id, req.params.id);
  await db2.logAudit(
    user.id,
    user.name,
    user.role,
    "PATIENT_DELETE_PRESCRIPTION",
    "Prescription",
    req.params.id,
    "\u0642\u0627\u0645 \u0627\u0644\u0645\u0631\u064A\u0636 \u0628\u062D\u0630\u0641 \u0631\u0648\u0634\u062A\u0629."
  );
  res.json({ success: true, message: "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0631\u0648\u0634\u062A\u0629 \u0628\u0646\u062C\u0627\u062D." });
}));
app2.get("/api/admin/dashboard-stats", authenticateToken, requireRoles("super_admin", "receptionist", "content_editor"), wrap(async (req, res) => {
  const stats = await db2.getDashboardStats();
  res.json({ success: true, data: stats });
}));
app2.get("/api/admin/prescriptions", authenticateToken, requireRoles("super_admin", "receptionist"), wrap(async (req, res) => {
  const { search } = req.query;
  let list = await db2.getAllPrescriptions();
  if (search) {
    const q = search.trim().toLowerCase();
    list = list.filter(
      (p) => (p.patientName || "").toLowerCase().includes(q) || (p.patientPhone || "").includes(q) || (p.patientEmail || "").toLowerCase().includes(q) || (p.createdAt || "").toLowerCase().includes(q)
    );
  }
  res.json({ success: true, data: list });
}));
app2.get("/api/admin/appointments", authenticateToken, requireRoles("super_admin", "receptionist"), wrap(async (req, res) => {
  const { branchId, serviceId, status, dateFrom, dateTo, search } = req.query;
  const appointments = await db2.getAppointments({ branchId, serviceId, status, dateFrom, dateTo, search });
  res.json({ success: true, data: appointments });
}));
app2.post("/api/admin/appointments", authenticateToken, requireRoles("super_admin", "receptionist"), wrap(async (req, res) => {
  const adminUser = req.user;
  const {
    patientName,
    patientPhone,
    patientEmail,
    patientAge,
    patientGender,
    serviceId,
    branchId,
    appointmentDate,
    appointmentTime,
    confirmationMethod,
    notes,
    clinicInternalNotes
  } = req.body;
  if (!patientName || !patientPhone || !serviceId || !branchId || !appointmentDate || !appointmentTime) {
    return res.status(400).json({ success: false, message: "\u064A\u0631\u062C\u0649 \u0625\u0643\u0645\u0627\u0644 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629 \u0644\u0644\u062D\u062C\u0632." });
  }
  const appointment = await db2.createAppointment({
    patientName,
    patientPhone,
    patientEmail,
    patientAge,
    patientGender,
    serviceId,
    branchId,
    appointmentDate,
    appointmentTime,
    confirmationMethod,
    notes
  });
  if (clinicInternalNotes) {
    await db2.updateAppointmentStatus(appointment.id, appointment.status, void 0, clinicInternalNotes);
  }
  await db2.logAudit(
    adminUser.id,
    adminUser.name,
    adminUser.role,
    "ADMIN_CREATE_APPOINTMENT",
    "Appointment",
    appointment.id,
    `\u062A\u0633\u062C\u064A\u0644 \u062D\u062C\u0632 \u064A\u062F\u0648\u064A \u0628\u0648\u0627\u0633\u0637\u0629 \u0645\u0648\u0638\u0641 \u0627\u0644\u0627\u0633\u062A\u0642\u0628\u0627\u0644: ${appointment.patientName} (${appointment.bookingNumber})`
  );
  res.status(201).json({ success: true, message: "\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062D\u062C\u0632 \u0628\u0646\u062C\u0627\u062D.", data: appointment });
}));
app2.patch("/api/admin/appointments/:id/status", authenticateToken, requireRoles("super_admin", "receptionist"), wrap(async (req, res) => {
  const adminUser = req.user;
  const { status, reason, clinicInternalNotes } = req.body;
  const allowedStatuses = ["new", "confirmed", "checked_in", "completed", "cancelled", "no_show"];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: "\u062D\u0627\u0644\u0629 \u0627\u0644\u062D\u062C\u0632 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629." });
  }
  const apt = await db2.findAppointmentById(req.params.id);
  if (!apt) {
    return res.status(404).json({ success: false, message: "\u0627\u0644\u0645\u0648\u0639\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F." });
  }
  const updated = await db2.updateAppointmentStatus(apt.id, status, reason, clinicInternalNotes);
  await db2.logAudit(
    adminUser.id,
    adminUser.name,
    adminUser.role,
    "UPDATE_APPOINTMENT_STATUS",
    "Appointment",
    apt.id,
    `\u062A\u0639\u062F\u064A\u0644 \u062D\u0627\u0644\u0629 \u0627\u0644\u062D\u062C\u0632 ${apt.bookingNumber} \u0645\u0646 ${apt.status} \u0625\u0644\u0649 ${status}. \u0645\u0644\u0627\u062D\u0638\u0627\u062A: ${clinicInternalNotes || "\u0644\u0627 \u062A\u0648\u062C\u062F"}`
  );
  res.json({ success: true, message: "\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u062D\u0627\u0644\u0629 \u0627\u0644\u062D\u062C\u0632 \u0628\u0646\u062C\u0627\u062D.", data: updated });
}));
app2.delete("/api/admin/appointments/:id", authenticateToken, requireRoles("super_admin", "receptionist"), wrap(async (req, res) => {
  const adminUser = req.user;
  const apt = await db2.findAppointmentById(req.params.id);
  if (!apt) {
    return res.status(404).json({ success: false, message: "\u0627\u0644\u0645\u0648\u0639\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F." });
  }
  const deleted = await db2.deleteAppointment(req.params.id);
  await db2.logAudit(
    adminUser.id,
    adminUser.name,
    adminUser.role,
    "DELETE_APPOINTMENT",
    "Appointment",
    apt.id,
    `\u062D\u0630\u0641 \u0627\u0644\u062D\u062C\u0632 \u0631\u0642\u0645 ${apt.bookingNumber} \u0644\u0644\u0645\u0631\u064A\u0636 ${apt.patientName} \u0645\u0646 \u0627\u0644\u0646\u0638\u0627\u0645 \u0628\u0648\u0627\u0633\u0637\u0629 \u0627\u0644\u0625\u062F\u0627\u0631\u0629.`
  );
  res.json({ success: true, message: "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0645\u0648\u0639\u062F \u0628\u0634\u0643\u0644 \u062F\u0627\u0626\u0645 \u0645\u0646 \u0627\u0644\u0646\u0638\u0627\u0645.", data: deleted });
}));
app2.put("/api/admin/appointments/:id/reschedule", authenticateToken, requireRoles("super_admin", "receptionist"), wrap(async (req, res) => {
  const adminUser = req.user;
  const { newDate, newTime, newBranchId } = req.body;
  const updated = await db2.rescheduleAppointment(req.params.id, newDate, newTime, newBranchId);
  await db2.logAudit(
    adminUser.id,
    adminUser.name,
    adminUser.role,
    "ADMIN_RESCHEDULE_APPOINTMENT",
    "Appointment",
    req.params.id,
    `\u062A\u0639\u062F\u064A\u0644 \u0645\u0648\u0639\u062F \u0643\u0634\u0641 \u0628\u0648\u0627\u0633\u0637\u0629 \u0627\u0644\u0625\u062F\u0627\u0631\u0629 \u0625\u0644\u0649 \u062A\u0627\u0631\u064A\u062E ${newDate} \u0627\u0644\u0633\u0627\u0639\u0629 ${newTime}`
  );
  res.json({ success: true, message: "\u062A\u0645 \u062A\u0639\u062F\u064A\u0644 \u0645\u0648\u0639\u062F \u0627\u0644\u0643\u0634\u0641 \u0628\u0646\u062C\u0627\u062D.", data: updated });
}));
app2.get("/api/admin/calendar", authenticateToken, requireRoles("super_admin", "receptionist"), wrap(async (req, res) => {
  const { branchId, month } = req.query;
  const all = await db2.getAppointments({ branchId });
  const filtered = month ? all.filter((a) => a.appointmentDate.startsWith(month)) : all;
  res.json({ success: true, data: filtered });
}));
app2.get("/api/admin/patients", authenticateToken, requireRoles("super_admin", "receptionist"), wrap(async (req, res) => {
  const { search } = req.query;
  const [appointments, registeredUsers] = await Promise.all([
    db2.getAppointments(),
    db2.getUsers()
  ]);
  const patients = registeredUsers.filter((u) => u.role === "patient");
  const patientMap = /* @__PURE__ */ new Map();
  patients.forEach((u) => {
    patientMap.set(u.phone, {
      id: u.id,
      name: u.name,
      phone: u.phone,
      email: u.email,
      age: u.age,
      gender: u.gender,
      isRegistered: true,
      totalBookings: 0,
      lastVisitDate: null
    });
  });
  appointments.forEach((apt) => {
    const existing = patientMap.get(apt.patientPhone) || {
      id: apt.patientId || `guest_${apt.patientPhone}`,
      name: apt.patientName,
      phone: apt.patientPhone,
      email: apt.patientEmail,
      age: apt.patientAge,
      gender: apt.patientGender,
      isRegistered: !!apt.patientId,
      totalBookings: 0,
      lastVisitDate: null
    };
    existing.totalBookings += 1;
    if (!existing.lastVisitDate || apt.appointmentDate > existing.lastVisitDate) {
      existing.lastVisitDate = apt.appointmentDate;
    }
    patientMap.set(apt.patientPhone, existing);
  });
  let list = Array.from(patientMap.values());
  if (search) {
    const s = search.toLowerCase().trim();
    list = list.filter((p) => p.name.toLowerCase().includes(s) || p.phone.includes(s));
  }
  res.json({ success: true, data: list });
}));
app2.get("/api/admin/patients/:phone/history", authenticateToken, requireRoles("super_admin", "receptionist"), wrap(async (req, res) => {
  const phone = req.params.phone;
  const all = await db2.getAppointments();
  const history = all.filter((a) => a.patientPhone === phone);
  res.json({ success: true, data: history });
}));
app2.delete("/api/admin/patients/:id", authenticateToken, requireRoles("super_admin"), wrap(async (req, res) => {
  const adminUser = req.user;
  const deactivated = await db2.deactivatePatient(req.params.id);
  if (!deactivated) {
    return res.status(404).json({ success: false, message: "\u0627\u0644\u0645\u0631\u064A\u0636 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F." });
  }
  await db2.logAudit(
    adminUser.id,
    adminUser.name,
    adminUser.role,
    "DEACTIVATE_PATIENT",
    "User",
    req.params.id,
    `\u0625\u064A\u0642\u0627\u0641 \u062A\u0646\u0634\u064A\u0637 \u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u0631\u064A\u0636: ${deactivated.name}. \u0644\u0646 \u064A\u062A\u0645\u0643\u0646 \u0645\u0646 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0648\u0644\u0646 \u064A\u0638\u0647\u0631 \u0641\u064A \u062F\u0644\u064A\u0644 \u0627\u0644\u0645\u0631\u0636\u0649.`
  );
  res.json({ success: true, message: "\u062A\u0645 \u0625\u064A\u0642\u0627\u0641 \u062A\u0646\u0634\u064A\u0637 \u0627\u0644\u062D\u0633\u0627\u0628 \u0628\u0646\u062C\u0627\u062D.", data: deactivated });
}));
app2.delete("/api/admin/patients/:id/permanent", authenticateToken, requireRoles("super_admin"), wrap(async (req, res) => {
  const adminUser = req.user;
  const deleted = await db2.deletePatient(req.params.id);
  if (!deleted) {
    return res.status(404).json({ success: false, message: "\u0627\u0644\u0645\u0631\u064A\u0636 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F." });
  }
  await db2.logAudit(
    adminUser.id,
    adminUser.name,
    adminUser.role,
    "DELETE_PATIENT",
    "User",
    req.params.id,
    `\u062D\u0630\u0641 \u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u0631\u064A\u0636 \u0646\u0647\u0627\u0626\u064A\u0627\u064B \u0645\u0646 \u0627\u0644\u0646\u0638\u0627\u0645: ${deleted.name}.`
  );
  res.json({ success: true, message: "\u062A\u0645 \u062D\u0630\u0641 \u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u0631\u064A\u0636 \u0646\u0647\u0627\u0626\u064A\u0627\u064B \u0645\u0646 \u0627\u0644\u0646\u0638\u0627\u0645.", data: deleted });
}));
app2.get("/api/admin/working-hours", authenticateToken, requireRoles("super_admin", "receptionist"), wrap(async (req, res) => {
  const { branchId } = req.query;
  res.json({ success: true, data: await db2.getWorkingHours(branchId) });
}));
app2.put("/api/admin/working-hours/:id", authenticateToken, requireRoles("super_admin"), wrap(async (req, res) => {
  const adminUser = req.user;
  const updated = await db2.updateWorkingHour(req.params.id, req.body);
  if (!updated) return res.status(404).json({ success: false, message: "\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0645\u0648\u0627\u0639\u064A\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629." });
  await db2.logAudit(
    adminUser.id,
    adminUser.name,
    adminUser.role,
    "UPDATE_WORKING_HOURS",
    "WorkingHourRule",
    req.params.id,
    `\u062A\u062D\u062F\u064A\u062B \u0645\u0648\u0627\u0639\u064A\u062F \u0648\u0633\u0627\u0639\u0627\u062A \u0627\u0644\u0639\u0645\u0644 \u0644\u0644\u0641\u0631\u0639.`
  );
  res.json({ success: true, message: "\u062A\u0645 \u062D\u0641\u0638 \u0645\u0648\u0627\u0639\u064A\u062F \u0627\u0644\u0639\u0645\u0644 \u0628\u0646\u062C\u0627\u062D.", data: updated });
}));
app2.get("/api/admin/exceptions", authenticateToken, requireRoles("super_admin", "receptionist"), wrap(async (req, res) => {
  const { branchId } = req.query;
  res.json({ success: true, data: await db2.getExceptions(branchId) });
}));
app2.post("/api/admin/exceptions", authenticateToken, requireRoles("super_admin"), wrap(async (req, res) => {
  const adminUser = req.user;
  const created = await db2.createException(req.body);
  await db2.logAudit(
    adminUser.id,
    adminUser.name,
    adminUser.role,
    "CREATE_SCHEDULE_EXCEPTION",
    "ScheduleException",
    created.id,
    `\u0625\u0636\u0627\u0641\u0629 \u0625\u062C\u0627\u0632\u0629 \u0623\u0648 \u0645\u0648\u0639\u062F \u0627\u0633\u062A\u062B\u0646\u0627\u0626\u064A \u0628\u062A\u0627\u0631\u064A\u062E ${created.date}. \u0627\u0644\u0633\u0628\u0628: ${created.reason}`
  );
  res.status(201).json({ success: true, message: "\u062A\u0645\u062A \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0627\u0633\u062A\u062B\u0646\u0627\u0621 \u0628\u0646\u062C\u0627\u062D.", data: created });
}));
app2.delete("/api/admin/exceptions/:id", authenticateToken, requireRoles("super_admin"), wrap(async (req, res) => {
  const adminUser = req.user;
  await db2.deleteException(req.params.id);
  await db2.logAudit(adminUser.id, adminUser.name, adminUser.role, "DELETE_SCHEDULE_EXCEPTION", "ScheduleException", req.params.id, "\u062D\u0630\u0641 \u0645\u0648\u0639\u062F \u0627\u0633\u062A\u062B\u0646\u0627\u0626\u064A/\u0625\u062C\u0627\u0632\u0629.");
  res.json({ success: true, message: "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0627\u0633\u062A\u062B\u0646\u0627\u0621 \u0628\u0646\u062C\u0627\u062D." });
}));
app2.put("/api/admin/exceptions/:id", authenticateToken, requireRoles("super_admin"), wrap(async (req, res) => {
  const adminUser = req.user;
  const updated = await db2.updateException(req.params.id, req.body);
  if (!updated) return res.status(404).json({ success: false, message: "\u0627\u0644\u0627\u0633\u062A\u062B\u0646\u0627\u0621 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F." });
  await db2.logAudit(adminUser.id, adminUser.name, adminUser.role, "UPDATE_SCHEDULE_EXCEPTION", "ScheduleException", req.params.id, `\u062A\u062D\u062F\u064A\u062B \u0627\u0633\u062A\u062B\u0646\u0627\u0621 \u0627\u0644\u0645\u0648\u0627\u0639\u064A\u062F: ${updated.reason}`);
  res.json({ success: true, message: "\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0627\u0633\u062A\u062B\u0646\u0627\u0621 \u0628\u0646\u062C\u0627\u062D.", data: updated });
}));
app2.get("/api/admin/branches", authenticateToken, requireRoles("super_admin", "receptionist", "content_editor"), wrap(async (req, res) => {
  res.json({ success: true, data: await db2.getBranches(true) });
}));
app2.post("/api/admin/branches", authenticateToken, requireRoles("super_admin"), wrap(async (req, res) => {
  const adminUser = req.user;
  const branch = await db2.createBranch(req.body);
  await db2.logAudit(adminUser.id, adminUser.name, adminUser.role, "CREATE_BRANCH", "Branch", branch.id, `\u0625\u0636\u0627\u0641\u0629 \u0641\u0631\u0639 \u062C\u062F\u064A\u062F: ${branch.name}`);
  res.status(201).json({ success: true, message: "\u062A\u0645\u062A \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0641\u0631\u0639 \u0628\u0646\u062C\u0627\u062D.", data: branch });
}));
app2.put("/api/admin/branches/:id", authenticateToken, requireRoles("super_admin"), wrap(async (req, res) => {
  const adminUser = req.user;
  const branch = await db2.updateBranch(req.params.id, req.body);
  if (!branch) return res.status(404).json({ success: false, message: "\u0627\u0644\u0641\u0631\u0639 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F." });
  await db2.logAudit(adminUser.id, adminUser.name, adminUser.role, "UPDATE_BRANCH", "Branch", branch.id, `\u062A\u062D\u062F\u064A\u062B \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0641\u0631\u0639: ${branch.name}`);
  res.json({ success: true, message: "\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0641\u0631\u0639 \u0628\u0646\u062C\u0627\u062D.", data: branch });
}));
app2.delete("/api/admin/branches/:id", authenticateToken, requireRoles("super_admin"), wrap(async (req, res) => {
  const adminUser = req.user;
  await db2.deleteBranch(req.params.id);
  await db2.logAudit(adminUser.id, adminUser.name, adminUser.role, "DELETE_BRANCH", "Branch", req.params.id, `\u062D\u0630\u0641 \u0641\u0631\u0639 \u0645\u0646 \u0627\u0644\u0646\u0638\u0627\u0645.`);
  res.json({ success: true, message: "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0641\u0631\u0639 \u0628\u0646\u062C\u0627\u062D." });
}));
app2.get("/api/admin/services", authenticateToken, requireRoles("super_admin", "receptionist", "content_editor"), wrap(async (req, res) => {
  res.json({ success: true, data: await db2.getServices(true) });
}));
app2.post("/api/admin/services", authenticateToken, requireRoles("super_admin", "content_editor"), wrap(async (req, res) => {
  const adminUser = req.user;
  const service = await db2.createService(req.body);
  await db2.logAudit(adminUser.id, adminUser.name, adminUser.role, "CREATE_SERVICE", "MedicalService", service.id, `\u0625\u0636\u0627\u0641\u0629 \u062E\u062F\u0645\u0629 \u0648\u062A\u062E\u0635\u0635 \u0637\u0628\u064A: ${service.name}`);
  res.status(201).json({ success: true, message: "\u062A\u0645\u062A \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u062A\u062E\u0635\u0635 \u0628\u0646\u062C\u0627\u062D.", data: service });
}));
app2.put("/api/admin/services/:id", authenticateToken, requireRoles("super_admin", "content_editor"), wrap(async (req, res) => {
  const adminUser = req.user;
  const service = await db2.updateService(req.params.id, req.body);
  if (!service) return res.status(404).json({ success: false, message: "\u0627\u0644\u062E\u062F\u0645\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629." });
  await db2.logAudit(adminUser.id, adminUser.name, adminUser.role, "UPDATE_SERVICE", "MedicalService", service.id, `\u062A\u0639\u062F\u064A\u0644 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062E\u062F\u0645\u0629 \u0627\u0644\u0637\u0628\u064A\u0629: ${service.name}`);
  res.json({ success: true, message: "\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u062A\u062E\u0635\u0635 \u0628\u0646\u062C\u0627\u062D.", data: service });
}));
app2.delete("/api/admin/services/:id", authenticateToken, requireRoles("super_admin"), wrap(async (req, res) => {
  const adminUser = req.user;
  await db2.deleteService(req.params.id);
  await db2.logAudit(adminUser.id, adminUser.name, adminUser.role, "DELETE_SERVICE", "MedicalService", req.params.id, `\u062D\u0630\u0641 \u062A\u062E\u0635\u0635 \u0637\u0628\u064A.`);
  res.json({ success: true, message: "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u062A\u062E\u0635\u0635 \u0628\u0646\u062C\u0627\u062D." });
}));
app2.get("/api/admin/content/doctor-profile", authenticateToken, requireRoles("super_admin", "content_editor"), wrap(async (req, res) => {
  res.json({ success: true, data: await db2.getDoctorProfile() });
}));
app2.put("/api/admin/content/doctor-profile", authenticateToken, requireRoles("super_admin", "content_editor"), wrap(async (req, res) => {
  const adminUser = req.user;
  const profile = await db2.updateDoctorProfile(req.body, adminUser.id);
  await db2.logAudit(adminUser.id, adminUser.name, adminUser.role, "UPDATE_DOCTOR_PROFILE", "DoctorProfile", "root", "\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0633\u064A\u0631\u0629 \u0627\u0644\u0630\u0627\u062A\u064A\u0629 \u0648\u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u0637\u0628\u064A\u0628 \u0648\u0627\u0639\u062A\u0645\u0627\u062F\u0647\u0627.");
  res.json({ success: true, message: "\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0648\u0627\u0639\u062A\u0645\u0627\u062F \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u062A\u0639\u0631\u064A\u0641\u064A \u0644\u0644\u0637\u0628\u064A\u0628 \u0628\u0646\u062C\u0627\u062D.", data: profile });
}));
app2.get("/api/admin/content/reviews", authenticateToken, requireRoles("super_admin", "content_editor"), wrap(async (req, res) => {
  res.json({ success: true, data: await db2.getReviews(true) });
}));
app2.patch("/api/admin/content/reviews/:id/approval", authenticateToken, requireRoles("super_admin", "content_editor"), wrap(async (req, res) => {
  const adminUser = req.user;
  const { isApproved, isFeatured } = req.body;
  const review = await db2.updateReviewApproval(req.params.id, isApproved, isFeatured);
  if (!review) return res.status(404).json({ success: false, message: "\u0627\u0644\u062A\u0642\u064A\u064A\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F." });
  await db2.logAudit(adminUser.id, adminUser.name, adminUser.role, "APPROVE_REVIEW", "Review", review.id, `\u062A\u063A\u064A\u064A\u0631 \u062D\u0627\u0644\u0629 \u0627\u0639\u062A\u0645\u0627\u062F \u0627\u0644\u062A\u0642\u064A\u064A\u0645 \u0625\u0644\u0649: ${isApproved ? "\u0645\u0639\u062A\u0645\u062F \u0648\u0645\u0646\u0634\u0648\u0631" : "\u0645\u062D\u062C\u0648\u0628"}`);
  res.json({ success: true, message: "\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u062D\u0627\u0644\u0629 \u0627\u0639\u062A\u0645\u0627\u062F \u0627\u0644\u062A\u0642\u064A\u064A\u0645 \u0628\u0646\u062C\u0627\u062D.", data: review });
}));
app2.delete("/api/admin/content/reviews/:id", authenticateToken, requireRoles("super_admin", "content_editor"), wrap(async (req, res) => {
  const adminUser = req.user;
  await db2.deleteReview(req.params.id);
  await db2.logAudit(adminUser.id, adminUser.name, adminUser.role, "DELETE_REVIEW", "Review", req.params.id, `\u062D\u0630\u0641 \u062A\u0642\u064A\u064A\u0645 \u0645\u0631\u064A\u0636.`);
  res.json({ success: true, message: "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u062A\u0642\u064A\u064A\u0645 \u0628\u0646\u062C\u0627\u062D." });
}));
app2.put("/api/admin/content/reviews/:id", authenticateToken, requireRoles("super_admin", "content_editor"), wrap(async (req, res) => {
  const adminUser = req.user;
  const updated = await db2.updateReview(req.params.id, req.body);
  if (!updated) return res.status(404).json({ success: false, message: "\u0627\u0644\u062A\u0642\u064A\u064A\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F." });
  await db2.logAudit(adminUser.id, adminUser.name, adminUser.role, "UPDATE_REVIEW", "Review", updated.id, `\u062A\u062D\u062F\u064A\u062B \u0628\u064A\u0627\u0646\u0627\u062A \u062A\u0642\u064A\u064A\u0645 \u0645\u0631\u064A\u0636.`);
  res.json({ success: true, message: "\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u062A\u0642\u064A\u064A\u0645 \u0628\u0646\u062C\u0627\u062D.", data: updated });
}));
app2.get("/api/admin/content/announcements", authenticateToken, requireRoles("super_admin", "content_editor"), wrap(async (req, res) => {
  res.json({ success: true, data: await db2.getAnnouncements(true) });
}));
app2.post("/api/admin/content/announcements", authenticateToken, requireRoles("super_admin", "content_editor"), wrap(async (req, res) => {
  const adminUser = req.user;
  const { message, type, isActive } = req.body || {};
  if (!message || !String(message).trim()) {
    return res.status(400).json({ success: false, message: "\u064A\u0631\u062C\u0649 \u0643\u062A\u0627\u0628\u0629 \u0646\u0635 \u0627\u0644\u0625\u0639\u0644\u0627\u0646." });
  }
  const anc = await db2.createAnnouncement({
    message: String(message).trim(),
    type: type === "alert" || type === "success" || type === "info" ? type : "info",
    isActive: isActive !== false
  });
  await db2.logAudit(adminUser.id, adminUser.name, adminUser.role, "CREATE_ANNOUNCEMENT", "Announcement", anc.id, `\u0625\u0636\u0627\u0641\u0629 \u0625\u0639\u0644\u0627\u0646 \u062C\u062F\u064A\u062F \u0644\u0634\u0631\u064A\u0637 \u0627\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062A.`);
  res.status(201).json({ success: true, message: "\u062A\u0645\u062A \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0625\u0639\u0644\u0627\u0646 \u0628\u0646\u062C\u0627\u062D.", data: anc });
}));
app2.delete("/api/admin/content/announcements/:id", authenticateToken, requireRoles("super_admin", "content_editor"), wrap(async (req, res) => {
  const adminUser = req.user;
  await db2.deleteAnnouncement(req.params.id);
  await db2.logAudit(adminUser.id, adminUser.name, adminUser.role, "DELETE_ANNOUNCEMENT", "Announcement", req.params.id, `\u062D\u0630\u0641 \u0634\u0631\u064A\u0637 \u0625\u0639\u0644\u0627\u0646.`);
  res.json({ success: true, message: "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0625\u0639\u0644\u0627\u0646 \u0628\u0646\u062C\u0627\u062D." });
}));
app2.get("/api/admin/content/faqs", authenticateToken, requireRoles("super_admin", "content_editor"), wrap(async (req, res) => {
  res.json({ success: true, data: await db2.getFaqs(true) });
}));
app2.post("/api/admin/content/faqs", authenticateToken, requireRoles("super_admin", "content_editor"), wrap(async (req, res) => {
  const adminUser = req.user;
  const faq = await db2.createFaq(req.body);
  await db2.logAudit(adminUser.id, adminUser.name, adminUser.role, "CREATE_FAQ", "FAQItem", faq.id, `\u0625\u0636\u0627\u0641\u0629 \u0633\u0624\u0627\u0644 \u0634\u0627\u0626\u0639 \u062C\u062F\u064A\u062F.`);
  res.status(201).json({ success: true, message: "\u062A\u0645\u062A \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0633\u0624\u0627\u0644 \u0628\u0646\u062C\u0627\u062D.", data: faq });
}));
app2.put("/api/admin/content/faqs/:id", authenticateToken, requireRoles("super_admin", "content_editor"), wrap(async (req, res) => {
  const adminUser = req.user;
  const faq = await db2.updateFaq(req.params.id, req.body);
  if (!faq) return res.status(404).json({ success: false, message: "\u0627\u0644\u0633\u0624\u0627\u0644 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F." });
  await db2.logAudit(adminUser.id, adminUser.name, adminUser.role, "UPDATE_FAQ", "FAQItem", faq.id, `\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0633\u0624\u0627\u0644 \u0627\u0644\u0634\u0627\u0626\u0639.`);
  res.json({ success: true, message: "\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0633\u0624\u0627\u0644 \u0628\u0646\u062C\u0627\u062D.", data: faq });
}));
app2.delete("/api/admin/content/faqs/:id", authenticateToken, requireRoles("super_admin", "content_editor"), wrap(async (req, res) => {
  const adminUser = req.user;
  await db2.deleteFaq(req.params.id);
  await db2.logAudit(adminUser.id, adminUser.name, adminUser.role, "DELETE_FAQ", "FAQItem", req.params.id, `\u062D\u0630\u0641 \u0633\u0624\u0627\u0644 \u0634\u0627\u0626\u0639.`);
  res.json({ success: true, message: "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0633\u0624\u0627\u0644 \u0628\u0646\u062C\u0627\u062D." });
}));
app2.get("/api/admin/content/announcements", authenticateToken, requireRoles("super_admin", "content_editor"), wrap(async (req, res) => {
  res.json({ success: true, data: await db2.getAnnouncements(false) });
}));
app2.put("/api/admin/content/announcements/:id", authenticateToken, requireRoles("super_admin", "content_editor"), wrap(async (req, res) => {
  const adminUser = req.user;
  const anc = await db2.updateAnnouncement(req.params.id, req.body);
  await db2.logAudit(adminUser.id, adminUser.name, adminUser.role, "UPDATE_ANNOUNCEMENT", "Announcement", req.params.id, `\u062A\u062D\u062F\u064A\u062B \u0634\u0631\u064A\u0637 \u0627\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062A \u0648\u0627\u0644\u062A\u0646\u0628\u064A\u0647\u0627\u062A.`);
  res.json({ success: true, message: "\u062A\u0645 \u062D\u0641\u0638 \u0627\u0644\u0625\u0639\u0644\u0627\u0646 \u0628\u0646\u062C\u0627\u062D.", data: anc });
}));
app2.get("/api/admin/notifications", authenticateToken, requireRoles("super_admin", "receptionist"), wrap(async (req, res) => {
  res.json({ success: true, data: await db2.getNotifications(100) });
}));
app2.get("/api/admin/users", authenticateToken, requireRoles("super_admin"), wrap(async (req, res) => {
  res.json({ success: true, data: await db2.getUsers() });
}));
app2.get("/api/search/appointments", authenticateToken, requireRoles("super_admin", "receptionist"), wrap(async (req, res) => {
  const { q, status, branchId, serviceId, dateFrom, dateTo } = req.query;
  const appointments = await db2.getAppointments({ search: String(q), status: String(status || ""), branchId: String(branchId || ""), serviceId: String(serviceId || ""), dateFrom: String(dateFrom || ""), dateTo: String(dateTo || "") });
  res.json({ success: true, data: appointments });
}));
app2.get("/api/search/patients", authenticateToken, requireRoles("super_admin", "receptionist"), wrap(async (req, res) => {
  const { q } = req.query;
  const [appointments, registeredUsers] = await Promise.all([
    db2.getAppointments(),
    db2.getUsers()
  ]);
  const patients = registeredUsers.filter((u) => u.role === "patient");
  const patientMap = /* @__PURE__ */ new Map();
  patients.forEach((u) => {
    patientMap.set(u.phone, {
      id: u.id,
      name: u.name,
      phone: u.phone,
      email: u.email,
      age: u.age,
      gender: u.gender,
      isRegistered: true,
      totalBookings: 0,
      lastVisitDate: null
    });
  });
  appointments.forEach((apt) => {
    const existing = patientMap.get(apt.patientPhone) || {
      id: apt.patientId || `guest_${apt.patientPhone}`,
      name: apt.patientName,
      phone: apt.patientPhone,
      email: apt.patientEmail,
      age: apt.patientAge,
      gender: apt.patientGender,
      isRegistered: !!apt.patientId,
      totalBookings: 0,
      lastVisitDate: null
    };
    existing.totalBookings += 1;
    if (!existing.lastVisitDate || apt.appointmentDate > existing.lastVisitDate) {
      existing.lastVisitDate = apt.appointmentDate;
    }
    patientMap.set(apt.patientPhone, existing);
  });
  let list = Array.from(patientMap.values());
  if (q) {
    const s = String(q).toLowerCase().trim();
    list = list.filter((p) => p.name.toLowerCase().includes(s) || p.phone.includes(s));
  }
  res.json({ success: true, data: list });
}));
app2.get("/api/search/branches", authenticateToken, requireRoles("super_admin", "receptionist", "content_editor"), wrap(async (req, res) => {
  const { q } = req.query;
  const branches = await db2.getBranches(true);
  let list = branches;
  if (q) {
    const s = String(q).toLowerCase().trim();
    list = branches.filter((b) => b.name.toLowerCase().includes(s) || b.city.toLowerCase().includes(s));
  }
  res.json({ success: true, data: list });
}));
app2.get("/api/search/services", authenticateToken, requireRoles("super_admin", "receptionist", "content_editor"), wrap(async (req, res) => {
  const { q } = req.query;
  const services = await db2.getServices(true);
  let list = services;
  if (q) {
    const needle = String(q).toLowerCase().trim();
    list = services.filter((svc) => svc.name.toLowerCase().includes(needle) || svc.description && svc.description.toLowerCase().includes(needle));
  }
  res.json({ success: true, data: list });
}));
app2.post("/api/admin/users", authenticateToken, requireRoles("super_admin"), wrap(async (req, res) => {
  const adminUser = req.user;
  const { name, phone, email, password, role } = req.body;
  if (!name || !phone || !password || !role) {
    return res.status(400).json({ success: false, message: "\u064A\u0631\u062C\u0649 \u0645\u0644\u0621 \u062C\u0645\u064A\u0639 \u0627\u0644\u062D\u0642\u0648\u0644 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629 \u0644\u0644\u0645\u0648\u0638\u0641." });
  }
  if (!["super_admin", "receptionist", "content_editor"].includes(role)) {
    return res.status(400).json({ success: false, message: "\u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629." });
  }
  const cleanPhone = phone.trim().replace(/\s+/g, "");
  const cleanEmail = email && email.trim() ? email.trim().toLowerCase() : "";
  const authEmail = cleanEmail || `${cleanPhone}@hossam-clinic.local`;
  const existingByPhone = await db2.findUserByPhoneOrEmail(cleanPhone);
  if (existingByPhone) {
    return res.status(409).json({ success: false, message: "\u064A\u0648\u062C\u062F \u062D\u0633\u0627\u0628 \u0645\u0633\u062C\u0644 \u0628\u0627\u0644\u0641\u0639\u0644 \u0628\u0647\u0630\u0627 \u0627\u0644\u0631\u0642\u0645." });
  }
  if (cleanEmail) {
    const existingByEmail = await db2.findUserByPhoneOrEmail(cleanEmail);
    if (existingByEmail) {
      return res.status(409).json({ success: false, message: "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0633\u062A\u062E\u062F\u0645 \u0628\u0627\u0644\u0641\u0639\u0644 \u0645\u0646 \u0642\u0628\u0644 \u0645\u0648\u0638\u0641 \u0622\u062E\u0631." });
    }
  }
  const { firebaseAuth: firebaseAuth2 } = await Promise.resolve().then(() => (init_firebase(), firebase_exports));
  try {
    await firebaseAuth2().getUserByEmail(authEmail);
    return res.status(409).json({ success: false, message: "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0633\u062A\u062E\u062F\u0645 \u0628\u0627\u0644\u0641\u0639\u0644 \u0641\u064A \u0646\u0638\u0627\u0645 \u0627\u0644\u0645\u0635\u0627\u062F\u0642\u0629." });
  } catch (e) {
    if (e?.code !== "auth/user-not-found") {
      throw e;
    }
  }
  let uid;
  try {
    const userRecord = await firebaseAuth2().createUser({
      email: authEmail,
      password,
      displayName: name
    });
    await firebaseAuth2().setCustomUserClaims(userRecord.uid, { role });
    uid = userRecord.uid;
  } catch (e) {
    const code = e?.code || "";
    let friendly = "\u0641\u0634\u0644 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0641\u064A \u0646\u0638\u0627\u0645 \u0627\u0644\u0645\u0635\u0627\u062F\u0642\u0629.";
    if (code === "auth/email-already-exists") {
      friendly = "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0633\u062A\u062E\u062F\u0645 \u0628\u0627\u0644\u0641\u0639\u0644 \u0641\u064A \u0646\u0638\u0627\u0645 \u0627\u0644\u0645\u0635\u0627\u062F\u0642\u0629.";
    } else if (code === "auth/invalid-email") {
      friendly = "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u063A\u064A\u0631 \u0635\u0627\u0644\u062D.";
    } else if (code === "auth/invalid-password") {
      friendly = "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u064A\u062C\u0628 \u0623\u0646 \u0644\u0627 \u062A\u0642\u0644 \u0639\u0646 6 \u0623\u062D\u0631\u0641.";
    } else if (code === "auth/phone-number-already-exists") {
      friendly = "\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641 \u0645\u0631\u062A\u0628\u0637 \u0628\u062D\u0633\u0627\u0628 \u0622\u062E\u0631 \u0628\u0627\u0644\u0641\u0639\u0644.";
    }
    return res.status(409).json({ success: false, message: friendly });
  }
  const newUser = await db2.createUserWithId(uid, {
    name,
    phone: cleanPhone,
    email: cleanEmail || void 0,
    password,
    role
  });
  await db2.logAudit(adminUser.id, adminUser.name, adminUser.role, "CREATE_STAFF_USER", "User", uid, `\u0625\u0636\u0627\u0641\u0629 \u0645\u0633\u062A\u062E\u062F\u0645 \u0637\u0627\u0642\u0645 \u062C\u062F\u064A\u062F: ${newUser.name} \u0628\u0635\u0644\u0627\u062D\u064A\u0629 ${newUser.role}`);
  res.status(201).json({ success: true, message: "\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u0648\u0638\u0641 \u0628\u0646\u062C\u0627\u062D.", data: { ...newUser, id: uid } });
}));
app2.put("/api/admin/users/:id", authenticateToken, requireRoles("super_admin"), wrap(async (req, res) => {
  const adminUser = req.user;
  const updated = await db2.updateUser(req.params.id, req.body);
  if (!updated) return res.status(404).json({ success: false, message: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F." });
  await db2.logAudit(adminUser.id, adminUser.name, adminUser.role, "UPDATE_USER", "User", updated.id, `\u062A\u062D\u062F\u064A\u062B \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645.`);
  res.json({ success: true, message: "\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0628\u0646\u062C\u0627\u062D.", data: updated });
}));
app2.delete("/api/admin/users/:id", authenticateToken, requireRoles("super_admin"), wrap(async (req, res) => {
  const adminUser = req.user;
  const deleted = await db2.deleteUser(req.params.id);
  if (!deleted) return res.status(404).json({ success: false, message: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F." });
  await db2.logAudit(adminUser.id, adminUser.name, adminUser.role, "DELETE_USER", "User", req.params.id, `\u062D\u0630\u0641 \u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u0648\u0638\u0641: ${deleted.name}.`);
  res.json({ success: true, message: "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u062D\u0633\u0627\u0628 \u0628\u0646\u062C\u0627\u062D." });
}));
app2.put("/api/admin/content/doctorProfile", authenticateToken, requireRoles("super_admin", "content_editor"), wrap(async (req, res) => {
  const adminUser = req.user;
  const profile = await db2.updateDoctorProfile(req.body, adminUser.id);
  await db2.logAudit(adminUser.id, adminUser.name, adminUser.role, "UPDATE_DOCTOR_PROFILE", "DoctorProfile", "main", `\u062A\u062D\u062F\u064A\u062B \u0645\u0644\u0641 \u0627\u0644\u062F\u0643\u062A\u0648\u0631.`);
  res.json({ success: true, message: "\u062A\u0645 \u062D\u0641\u0638 \u0645\u0644\u0641 \u0627\u0644\u062F\u0643\u062A\u0648\u0631 \u0628\u0646\u062C\u0627\u062D.", data: profile });
}));
app2.all("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `\u0627\u0644\u0645\u0633\u0627\u0631 \u0627\u0644\u0628\u0631\u0645\u062C\u064A \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F (${req.method} ${req.originalUrl})`
  });
});
app2.use((err, req, res, next) => {
  console.error(`[API Error] ${req.method} ${req.originalUrl}`, err);
  if (res.headersSent) return next(err);
  res.status(500).json({
    success: false,
    message: err?.message || "\u062D\u062F\u062B \u062E\u0637\u0623 \u063A\u064A\u0631 \u0645\u062A\u0648\u0642\u0639 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645."
  });
});
async function startServer() {
  const { createServer: createViteServer } = await import("vite");
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app2.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app2.use(import_express.default.static(distPath));
    app2.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app2.listen(PORT, "0.0.0.0", () => {
    console.log(`Clinic Server running on http://0.0.0.0:${PORT}`);
  });
}
var isDirectRun = (
  // Node ESM entry detection
  typeof process !== "undefined" && process.argv[1] && /server\.(ts|js)$/.test(process.argv[1]) || // Vercel should never reach this branch — guard explicitly.
  !process.env.VERCEL
);
if (isDirectRun) {
  startServer().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  app,
  authenticateToken,
  requireRoles
});
//# sourceMappingURL=_server.cjs.map
