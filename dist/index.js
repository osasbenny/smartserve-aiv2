// server/_core/index.ts
import "dotenv/config";
import express2 from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/db.ts
import { eq, and, desc, asc, gte, lte, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

// drizzle/schema.ts
import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  decimal,
  json
} from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var businesses = mysqlTable("businesses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  industry: varchar("industry", { length: 100 }),
  website: varchar("website", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  logo: varchar("logo", { length: 500 }),
  subscriptionPlan: mysqlEnum("subscriptionPlan", ["free", "starter", "pro", "enterprise"]).default("free").notNull(),
  subscriptionStatus: mysqlEnum("subscriptionStatus", ["active", "inactive", "cancelled", "expired"]).default("inactive").notNull(),
  subscriptionEndDate: timestamp("subscriptionEndDate"),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var agents = mysqlTable("agents", {
  id: int("id").autoincrement().primaryKey(),
  businessId: int("businessId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  systemPrompt: text("systemPrompt"),
  welcomeMessage: text("welcomeMessage"),
  status: mysqlEnum("status", ["active", "inactive", "archived"]).default("active").notNull(),
  businessHoursStart: varchar("businessHoursStart", { length: 5 }),
  // HH:MM format
  businessHoursEnd: varchar("businessHoursEnd", { length: 5 }),
  // HH:MM format
  businessHoursTimezone: varchar("businessHoursTimezone", { length: 50 }).default("UTC"),
  businessHoursEnabled: boolean("businessHoursEnabled").default(true),
  faqData: json("faqData"),
  // Store FAQ as JSON array
  whatsappPhoneId: varchar("whatsappPhoneId", { length: 255 }),
  whatsappAccessToken: varchar("whatsappAccessToken", { length: 500 }),
  emailSenderAddress: varchar("emailSenderAddress", { length: 255 }),
  emailSenderName: varchar("emailSenderName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").notNull(),
  businessId: int("businessId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  whatsappPhone: varchar("whatsappPhone", { length: 20 }),
  preferredContactMethod: mysqlEnum("preferredContactMethod", ["email", "whatsapp", "phone"]).default("email"),
  tags: json("tags"),
  // JSON array of tags
  notes: text("notes"),
  lastInteractionAt: timestamp("lastInteractionAt"),
  satisfactionScore: int("satisfactionScore"),
  // 1-5 scale
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var chatMessages = mysqlTable("chatMessages", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").notNull(),
  clientId: int("clientId").notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  metadata: json("metadata"),
  // Store additional data like sentiment, intent, etc.
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var appointments = mysqlTable("appointments", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").notNull(),
  clientId: int("clientId").notNull(),
  businessId: int("businessId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime").notNull(),
  status: mysqlEnum("status", ["scheduled", "confirmed", "completed", "cancelled", "no-show"]).default("scheduled").notNull(),
  location: varchar("location", { length: 255 }),
  meetingLink: varchar("meetingLink", { length: 500 }),
  reminderSent: boolean("reminderSent").default(false),
  reminderSentAt: timestamp("reminderSentAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  appointmentId: int("appointmentId"),
  clientId: int("clientId").notNull(),
  agentId: int("agentId").notNull(),
  businessId: int("businessId").notNull(),
  type: mysqlEnum("type", ["email", "whatsapp", "sms"]).notNull(),
  subject: varchar("subject", { length: 255 }),
  content: text("content").notNull(),
  status: mysqlEnum("status", ["pending", "sent", "failed", "bounced"]).default("pending").notNull(),
  recipientEmail: varchar("recipientEmail", { length: 320 }),
  recipientPhone: varchar("recipientPhone", { length: 20 }),
  externalId: varchar("externalId", { length: 255 }),
  // For tracking with external services
  errorMessage: text("errorMessage"),
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var analytics = mysqlTable("analytics", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").notNull(),
  businessId: int("businessId").notNull(),
  date: timestamp("date").notNull(),
  totalChats: int("totalChats").default(0),
  totalMessages: int("totalMessages").default(0),
  totalAppointments: int("totalAppointments").default(0),
  completedAppointments: int("completedAppointments").default(0),
  cancelledAppointments: int("cancelledAppointments").default(0),
  averageSatisfactionScore: decimal("averageSatisfactionScore", { precision: 3, scale: 2 }),
  totalClients: int("totalClients").default(0),
  newClients: int("newClients").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  businessId: int("businessId").notNull(),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }).unique(),
  plan: mysqlEnum("plan", ["free", "starter", "pro", "enterprise"]).notNull(),
  status: mysqlEnum("status", ["active", "inactive", "cancelled", "expired"]).default("active").notNull(),
  billingCycle: mysqlEnum("billingCycle", ["monthly", "yearly"]).default("monthly").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD"),
  currentPeriodStart: timestamp("currentPeriodStart").notNull(),
  currentPeriodEnd: timestamp("currentPeriodEnd").notNull(),
  cancelledAt: timestamp("cancelledAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var invoices = mysqlTable("invoices", {
  id: int("id").autoincrement().primaryKey(),
  businessId: int("businessId").notNull(),
  subscriptionId: int("subscriptionId"),
  stripeInvoiceId: varchar("stripeInvoiceId", { length: 255 }).unique(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD"),
  status: mysqlEnum("status", ["draft", "open", "paid", "void", "uncollectible"]).default("open").notNull(),
  pdfUrl: varchar("pdfUrl", { length: 500 }),
  dueDate: timestamp("dueDate"),
  paidAt: timestamp("paidAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var activityLogs = mysqlTable("activityLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  businessId: int("businessId").notNull(),
  action: varchar("action", { length: 255 }).notNull(),
  entityType: varchar("entityType", { length: 100 }),
  entityId: int("entityId"),
  details: json("details"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/db.ts
var _db = null;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function createBusiness(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(businesses).values(data);
  return result;
}
async function getBusinessById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(businesses).where(eq(businesses.id, id)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getBusinessesByUserId(userId) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(businesses).where(eq(businesses.userId, userId));
}
async function updateBusiness(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(businesses).set(data).where(eq(businesses.id, id));
}
async function createAgent(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(agents).values(data);
  return result;
}
async function getAgentById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getAgentsByBusinessId(businessId) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(agents).where(eq(agents.businessId, businessId)).orderBy(desc(agents.createdAt));
}
async function updateAgent(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(agents).set(data).where(eq(agents.id, id));
}
async function deleteAgent(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(agents).where(eq(agents.id, id));
}
async function createClient(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(clients).values(data);
  return result;
}
async function getClientById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getClientsByAgentId(agentId) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(clients).where(eq(clients.agentId, agentId)).orderBy(desc(clients.lastInteractionAt));
}
async function getClientsByBusinessId(businessId) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(clients).where(eq(clients.businessId, businessId)).orderBy(desc(clients.lastInteractionAt));
}
async function updateClient(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(clients).set(data).where(eq(clients.id, id));
}
async function searchClients(businessId, query) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(clients).where(
    and(
      eq(clients.businessId, businessId),
      like(clients.name, `%${query}%`)
    )
  );
}
async function createChatMessage(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(chatMessages).values(data);
  return result;
}
async function getChatHistoryByAgentAndClient(agentId, clientId, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(chatMessages).where(
    and(
      eq(chatMessages.agentId, agentId),
      eq(chatMessages.clientId, clientId)
    )
  ).orderBy(asc(chatMessages.createdAt)).limit(limit);
}
async function createAppointment(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(appointments).values(data);
  return result;
}
async function getAppointmentById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(appointments).where(eq(appointments.id, id)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getAppointmentsByAgentId(agentId) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(appointments).where(eq(appointments.agentId, agentId)).orderBy(desc(appointments.startTime));
}
async function getAppointmentsByClientId(clientId) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(appointments).where(eq(appointments.clientId, clientId)).orderBy(desc(appointments.startTime));
}
async function getUpcomingAppointments(businessId, hoursAhead = 24) {
  const db = await getDb();
  if (!db) return [];
  const now = /* @__PURE__ */ new Date();
  const future = new Date(now.getTime() + hoursAhead * 60 * 60 * 1e3);
  return await db.select().from(appointments).where(
    and(
      eq(appointments.businessId, businessId),
      gte(appointments.startTime, now),
      lte(appointments.startTime, future)
    )
  ).orderBy(asc(appointments.startTime));
}
async function updateAppointment(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(appointments).set(data).where(eq(appointments.id, id));
}
async function getPendingNotifications() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(notifications).where(eq(notifications.status, "pending")).orderBy(asc(notifications.createdAt));
}
async function updateNotification(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(notifications).set(data).where(eq(notifications.id, id));
}
async function getAnalyticsByAgentAndDate(agentId, date) {
  const db = await getDb();
  if (!db) return void 0;
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  const result = await db.select().from(analytics).where(
    and(
      eq(analytics.agentId, agentId),
      gte(analytics.date, startOfDay),
      lte(analytics.date, endOfDay)
    )
  ).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function createOrUpdateAnalytics(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(analytics).values(data).onDuplicateKeyUpdate({ set: data });
}
async function getSubscriptionByBusinessId(businessId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(subscriptions).where(eq(subscriptions.businessId, businessId)).orderBy(desc(subscriptions.createdAt)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function createSubscription(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(subscriptions).values(data);
  return result;
}
async function updateSubscription(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(subscriptions).set(data).where(eq(subscriptions.id, id));
}
async function getInvoicesByBusinessId(businessId) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(invoices).where(eq(invoices.businessId, businessId)).orderBy(desc(invoices.createdAt));
}
async function createInvoice(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(invoices).values(data);
  return result;
}
async function updateInvoice(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(invoices).set(data).where(eq(invoices.id, id));
}
async function createActivityLog(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(activityLogs).values(data);
}
async function getActivityLogsByBusinessId(businessId, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(activityLogs).where(eq(activityLogs.businessId, businessId)).orderBy(desc(activityLogs.createdAt)).limit(limit);
}

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    const redirectUri = atob(state);
    return redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app) {
  app.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/routers.ts
import { z as z2 } from "zod";

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/_core/llm.ts
var ensureArray = (value) => Array.isArray(value) ? value : [value];
var normalizeContentPart = (part) => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }
  if (part.type === "text") {
    return part;
  }
  if (part.type === "image_url") {
    return part;
  }
  if (part.type === "file_url") {
    return part;
  }
  throw new Error("Unsupported message content part");
};
var normalizeMessage = (message) => {
  const { role, name, tool_call_id } = message;
  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content).map((part) => typeof part === "string" ? part : JSON.stringify(part)).join("\n");
    return {
      role,
      name,
      tool_call_id,
      content
    };
  }
  const contentParts = ensureArray(message.content).map(normalizeContentPart);
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text
    };
  }
  return {
    role,
    name,
    content: contentParts
  };
};
var normalizeToolChoice = (toolChoice, tools) => {
  if (!toolChoice) return void 0;
  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }
  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }
    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }
    return {
      type: "function",
      function: { name: tools[0].function.name }
    };
  }
  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name }
    };
  }
  return toolChoice;
};
var resolveApiUrl = () => ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0 ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions` : "https://forge.manus.im/v1/chat/completions";
var assertApiKey = () => {
  if (!ENV.forgeApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
};
var normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema
}) => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (explicitFormat.type === "json_schema" && !explicitFormat.json_schema?.schema) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }
  const schema = outputSchema || output_schema;
  if (!schema) return void 0;
  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }
  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...typeof schema.strict === "boolean" ? { strict: schema.strict } : {}
    }
  };
};
async function invokeLLM(params) {
  assertApiKey();
  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format
  } = params;
  const payload = {
    model: "gemini-2.5-flash",
    messages: messages.map(normalizeMessage)
  };
  if (tools && tools.length > 0) {
    payload.tools = tools;
  }
  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }
  payload.max_tokens = 32768;
  payload.thinking = {
    "budget_tokens": 128
  };
  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema
  });
  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }
  const response = await fetch(resolveApiUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.forgeApiKey}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} \u2013 ${errorText}`
    );
  }
  return await response.json();
}

// server/routers.ts
var appRouter = router({
  system: systemRouter,
  // ============ AUTH ROUTES ============
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true
      };
    })
  }),
  // ============ BUSINESS ROUTES ============
  business: router({
    create: protectedProcedure.input(
      z2.object({
        name: z2.string().min(1),
        description: z2.string().optional(),
        industry: z2.string().optional(),
        website: z2.string().optional(),
        phone: z2.string().optional(),
        address: z2.string().optional()
      })
    ).mutation(async ({ ctx, input }) => {
      const result = await createBusiness({
        userId: ctx.user.id,
        name: input.name,
        description: input.description,
        industry: input.industry,
        website: input.website,
        phone: input.phone,
        address: input.address,
        subscriptionPlan: "free",
        subscriptionStatus: "inactive"
      });
      return result;
    }),
    getById: protectedProcedure.input(z2.object({ id: z2.number() })).query(async ({ input }) => {
      return await getBusinessById(input.id);
    }),
    getMyBusinesses: protectedProcedure.query(async ({ ctx }) => {
      return await getBusinessesByUserId(ctx.user.id);
    }),
    update: protectedProcedure.input(
      z2.object({
        id: z2.number(),
        name: z2.string().optional(),
        description: z2.string().optional(),
        industry: z2.string().optional(),
        website: z2.string().optional(),
        phone: z2.string().optional(),
        address: z2.string().optional(),
        logo: z2.string().optional()
      })
    ).mutation(async ({ input }) => {
      await updateBusiness(input.id, input);
      return { success: true };
    })
  }),
  // ============ AGENT ROUTES ============
  agent: router({
    create: protectedProcedure.input(
      z2.object({
        businessId: z2.number(),
        name: z2.string().min(1),
        description: z2.string().optional(),
        systemPrompt: z2.string().optional(),
        welcomeMessage: z2.string().optional(),
        businessHoursStart: z2.string().optional(),
        businessHoursEnd: z2.string().optional(),
        businessHoursTimezone: z2.string().optional(),
        businessHoursEnabled: z2.boolean().optional()
      })
    ).mutation(async ({ input }) => {
      const result = await createAgent({
        businessId: input.businessId,
        name: input.name,
        description: input.description,
        systemPrompt: input.systemPrompt,
        welcomeMessage: input.welcomeMessage,
        businessHoursStart: input.businessHoursStart,
        businessHoursEnd: input.businessHoursEnd,
        businessHoursTimezone: input.businessHoursTimezone,
        businessHoursEnabled: input.businessHoursEnabled ?? true,
        status: "active"
      });
      return result;
    }),
    getById: protectedProcedure.input(z2.object({ id: z2.number() })).query(async ({ input }) => {
      return await getAgentById(input.id);
    }),
    getByBusinessId: protectedProcedure.input(z2.object({ businessId: z2.number() })).query(async ({ input }) => {
      return await getAgentsByBusinessId(input.businessId);
    }),
    update: protectedProcedure.input(
      z2.object({
        id: z2.number(),
        name: z2.string().optional(),
        description: z2.string().optional(),
        systemPrompt: z2.string().optional(),
        welcomeMessage: z2.string().optional(),
        businessHoursStart: z2.string().optional(),
        businessHoursEnd: z2.string().optional(),
        businessHoursTimezone: z2.string().optional(),
        businessHoursEnabled: z2.boolean().optional(),
        faqData: z2.any().optional(),
        whatsappPhoneId: z2.string().optional(),
        whatsappAccessToken: z2.string().optional(),
        emailSenderAddress: z2.string().optional(),
        emailSenderName: z2.string().optional()
      })
    ).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateAgent(id, data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      await deleteAgent(input.id);
      return { success: true };
    }),
    uploadFAQ: protectedProcedure.input(
      z2.object({
        agentId: z2.number(),
        faqs: z2.array(
          z2.object({
            question: z2.string(),
            answer: z2.string()
          })
        )
      })
    ).mutation(async ({ input }) => {
      await updateAgent(input.agentId, {
        faqData: input.faqs
      });
      return { success: true };
    })
  }),
  // ============ CLIENT ROUTES ============
  clientData: router({
    create: protectedProcedure.input(
      z2.object({
        agentId: z2.number(),
        businessId: z2.number(),
        name: z2.string().min(1),
        email: z2.string().optional(),
        phone: z2.string().optional(),
        whatsappPhone: z2.string().optional(),
        preferredContactMethod: z2.enum(["email", "whatsapp", "phone"]).optional()
      })
    ).mutation(async ({ input }) => {
      const result = await createClient({
        agentId: input.agentId,
        businessId: input.businessId,
        name: input.name,
        email: input.email,
        phone: input.phone,
        whatsappPhone: input.whatsappPhone,
        preferredContactMethod: input.preferredContactMethod
      });
      return result;
    }),
    getById: protectedProcedure.input(z2.object({ id: z2.number() })).query(async ({ input }) => {
      return await getClientById(input.id);
    }),
    getByAgentId: protectedProcedure.input(z2.object({ agentId: z2.number() })).query(async ({ input }) => {
      return await getClientsByAgentId(input.agentId);
    }),
    getByBusinessId: protectedProcedure.input(z2.object({ businessId: z2.number() })).query(async ({ input }) => {
      return await getClientsByBusinessId(input.businessId);
    }),
    update: protectedProcedure.input(
      z2.object({
        id: z2.number(),
        name: z2.string().optional(),
        email: z2.string().optional(),
        phone: z2.string().optional(),
        whatsappPhone: z2.string().optional(),
        preferredContactMethod: z2.enum(["email", "whatsapp", "phone"]).optional(),
        tags: z2.array(z2.string()).optional(),
        notes: z2.string().optional(),
        satisfactionScore: z2.number().optional()
      })
    ).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateClient(id, data);
      return { success: true };
    }),
    search: protectedProcedure.input(
      z2.object({
        businessId: z2.number(),
        query: z2.string()
      })
    ).query(async ({ input }) => {
      return await searchClients(input.businessId, input.query);
    })
  }),
  // ============ CHAT ROUTES ============
  chatData: router({
    sendMessage: protectedProcedure.input(
      z2.object({
        agentId: z2.number(),
        clientId: z2.number(),
        message: z2.string().min(1)
      })
    ).mutation(async ({ input }) => {
      await createChatMessage({
        agentId: input.agentId,
        clientId: input.clientId,
        role: "user",
        content: input.message
      });
      const agent = await getAgentById(input.agentId);
      const history = await getChatHistoryByAgentAndClient(
        input.agentId,
        input.clientId,
        20
      );
      if (!agent) throw new Error("Agent not found");
      const messages = [
        {
          role: "system",
          content: agent.systemPrompt || "You are a helpful customer service assistant."
        },
        ...history.map((msg) => ({
          role: msg.role,
          content: msg.content
        })),
        {
          role: "user",
          content: input.message
        }
      ];
      const response = await invokeLLM({
        messages
      });
      const messageContent = response.choices[0]?.message?.content;
      const assistantMessage = typeof messageContent === "string" ? messageContent : "I apologize, I could not generate a response.";
      await createChatMessage({
        agentId: input.agentId,
        clientId: input.clientId,
        role: "assistant",
        content: assistantMessage
      });
      await updateClient(input.clientId, {
        lastInteractionAt: /* @__PURE__ */ new Date()
      });
      return {
        userMessage: input.message,
        assistantMessage
      };
    }),
    getHistory: protectedProcedure.input(
      z2.object({
        agentId: z2.number(),
        clientId: z2.number(),
        limit: z2.number().optional()
      })
    ).query(async ({ input }) => {
      return await getChatHistoryByAgentAndClient(
        input.agentId,
        input.clientId,
        input.limit || 50
      );
    })
  }),
  // ============ APPOINTMENT ROUTES ============
  appointmentData: router({
    create: protectedProcedure.input(
      z2.object({
        agentId: z2.number(),
        clientId: z2.number(),
        businessId: z2.number(),
        title: z2.string().min(1),
        description: z2.string().optional(),
        startTime: z2.date(),
        endTime: z2.date(),
        location: z2.string().optional(),
        meetingLink: z2.string().optional()
      })
    ).mutation(async ({ input }) => {
      const result = await createAppointment({
        agentId: input.agentId,
        clientId: input.clientId,
        businessId: input.businessId,
        title: input.title,
        description: input.description,
        startTime: input.startTime,
        endTime: input.endTime,
        location: input.location,
        meetingLink: input.meetingLink,
        status: "scheduled"
      });
      return result;
    }),
    getById: protectedProcedure.input(z2.object({ id: z2.number() })).query(async ({ input }) => {
      return await getAppointmentById(input.id);
    }),
    getByAgentId: protectedProcedure.input(z2.object({ agentId: z2.number() })).query(async ({ input }) => {
      return await getAppointmentsByAgentId(input.agentId);
    }),
    getByClientId: protectedProcedure.input(z2.object({ clientId: z2.number() })).query(async ({ input }) => {
      return await getAppointmentsByClientId(input.clientId);
    }),
    getUpcoming: protectedProcedure.input(
      z2.object({
        businessId: z2.number(),
        hoursAhead: z2.number().optional()
      })
    ).query(async ({ input }) => {
      return await getUpcomingAppointments(
        input.businessId,
        input.hoursAhead || 24
      );
    }),
    update: protectedProcedure.input(
      z2.object({
        id: z2.number(),
        title: z2.string().optional(),
        description: z2.string().optional(),
        startTime: z2.date().optional(),
        endTime: z2.date().optional(),
        status: z2.enum(["scheduled", "confirmed", "completed", "cancelled", "no-show"]).optional(),
        location: z2.string().optional(),
        meetingLink: z2.string().optional()
      })
    ).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateAppointment(id, data);
      return { success: true };
    })
  }),
  // ============ NOTIFICATION ROUTES ============
  notificationData: router({
    getPending: protectedProcedure.query(async () => {
      return await getPendingNotifications();
    }),
    markAsSent: protectedProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      await updateNotification(input.id, {
        status: "sent",
        sentAt: /* @__PURE__ */ new Date()
      });
      return { success: true };
    }),
    markAsFailed: protectedProcedure.input(
      z2.object({
        id: z2.number(),
        errorMessage: z2.string().optional()
      })
    ).mutation(async ({ input }) => {
      await updateNotification(input.id, {
        status: "failed",
        errorMessage: input.errorMessage
      });
      return { success: true };
    })
  }),
  // ============ ANALYTICS ROUTES ============
  analyticsData: router({
    getByAgentAndDate: protectedProcedure.input(
      z2.object({
        agentId: z2.number(),
        date: z2.date()
      })
    ).query(async ({ input }) => {
      return await getAnalyticsByAgentAndDate(input.agentId, input.date);
    }),
    update: protectedProcedure.input(
      z2.object({
        agentId: z2.number(),
        businessId: z2.number(),
        date: z2.date(),
        totalChats: z2.number().optional(),
        totalMessages: z2.number().optional(),
        totalAppointments: z2.number().optional(),
        completedAppointments: z2.number().optional(),
        cancelledAppointments: z2.number().optional(),
        averageSatisfactionScore: z2.number().optional(),
        totalClients: z2.number().optional(),
        newClients: z2.number().optional()
      })
    ).mutation(async ({ input }) => {
      await createOrUpdateAnalytics({
        agentId: input.agentId,
        businessId: input.businessId,
        date: input.date,
        totalChats: input.totalChats,
        totalMessages: input.totalMessages,
        totalAppointments: input.totalAppointments,
        completedAppointments: input.completedAppointments,
        cancelledAppointments: input.cancelledAppointments,
        averageSatisfactionScore: input.averageSatisfactionScore ? String(input.averageSatisfactionScore) : void 0,
        totalClients: input.totalClients,
        newClients: input.newClients
      });
      return { success: true };
    })
  }),
  // ============ SUBSCRIPTION ROUTES ============
  subscriptionData: router({
    getByBusinessId: protectedProcedure.input(z2.object({ businessId: z2.number() })).query(async ({ input }) => {
      return await getSubscriptionByBusinessId(input.businessId);
    }),
    create: protectedProcedure.input(
      z2.object({
        businessId: z2.number(),
        plan: z2.enum(["free", "starter", "pro", "enterprise"]),
        billingCycle: z2.enum(["monthly", "yearly"]),
        amount: z2.number(),
        stripeSubscriptionId: z2.string().optional()
      })
    ).mutation(async ({ input }) => {
      const now = /* @__PURE__ */ new Date();
      const periodEnd = new Date(now);
      if (input.billingCycle === "monthly") {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      } else {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      }
      const result = await createSubscription({
        businessId: input.businessId,
        plan: input.plan,
        billingCycle: input.billingCycle,
        amount: String(input.amount),
        stripeSubscriptionId: input.stripeSubscriptionId,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd
      });
      return result;
    }),
    update: protectedProcedure.input(
      z2.object({
        id: z2.number(),
        plan: z2.enum(["free", "starter", "pro", "enterprise"]).optional(),
        status: z2.enum(["active", "inactive", "cancelled", "expired"]).optional()
      })
    ).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateSubscription(id, data);
      return { success: true };
    })
  }),
  // ============ INVOICE ROUTES ============
  invoiceData: router({
    getByBusinessId: protectedProcedure.input(z2.object({ businessId: z2.number() })).query(async ({ input }) => {
      return await getInvoicesByBusinessId(input.businessId);
    }),
    create: protectedProcedure.input(
      z2.object({
        businessId: z2.number(),
        subscriptionId: z2.number().optional(),
        amount: z2.number(),
        currency: z2.string().optional(),
        stripeInvoiceId: z2.string().optional()
      })
    ).mutation(async ({ input }) => {
      const result = await createInvoice({
        businessId: input.businessId,
        subscriptionId: input.subscriptionId,
        amount: String(input.amount),
        currency: input.currency || "USD",
        stripeInvoiceId: input.stripeInvoiceId,
        status: "open"
      });
      return result;
    }),
    markAsPaid: protectedProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      await updateInvoice(input.id, {
        status: "paid",
        paidAt: /* @__PURE__ */ new Date()
      });
      return { success: true };
    })
  }),
  // ============ ACTIVITY LOG ROUTES ============
  activityLogData: router({
    getByBusinessId: protectedProcedure.input(
      z2.object({
        businessId: z2.number(),
        limit: z2.number().optional()
      })
    ).query(async ({ input }) => {
      return await getActivityLogsByBusinessId(input.businessId, input.limit);
    }),
    log: protectedProcedure.input(
      z2.object({
        businessId: z2.number(),
        action: z2.string(),
        entityType: z2.string().optional(),
        entityId: z2.number().optional(),
        details: z2.any().optional()
      })
    ).mutation(async ({ ctx, input }) => {
      await createActivityLog({
        userId: ctx.user.id,
        businessId: input.businessId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        details: input.details
      });
      return { success: true };
    })
  })
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/vite.ts
import express from "express";
import fs from "fs";
import { nanoid } from "nanoid";
import path2 from "path";
import { createServer as createViteServer } from "vite";

// vite.config.ts
import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
var plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime()];
var vite_config_default = defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1"
    ],
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/_core/vite.ts
async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const distPath = process.env.NODE_ENV === "development" ? path2.resolve(import.meta.dirname, "../..", "dist", "public") : path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/_core/index.ts
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3e3) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
async function startServer() {
  const app = express2();
  const server = createServer(app);
  app.use(express2.json({ limit: "50mb" }));
  app.use(express2.urlencoded({ limit: "50mb", extended: true }));
  registerOAuthRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
startServer().catch(console.error);
