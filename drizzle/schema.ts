import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  decimal,
  json,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Business/Organization table for multi-tenant support
 */
export const businesses = mysqlTable("businesses", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Business = typeof businesses.$inferSelect;
export type InsertBusiness = typeof businesses.$inferInsert;

/**
 * AI Agent table - represents each custom AI chatbot
 */
export const agents = mysqlTable("agents", {
  id: int("id").autoincrement().primaryKey(),
  businessId: int("businessId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  systemPrompt: text("systemPrompt"),
  welcomeMessage: text("welcomeMessage"),
  status: mysqlEnum("status", ["active", "inactive", "archived"]).default("active").notNull(),
  businessHoursStart: varchar("businessHoursStart", { length: 5 }), // HH:MM format
  businessHoursEnd: varchar("businessHoursEnd", { length: 5 }), // HH:MM format
  businessHoursTimezone: varchar("businessHoursTimezone", { length: 50 }).default("UTC"),
  businessHoursEnabled: boolean("businessHoursEnabled").default(true),
  faqData: json("faqData"), // Store FAQ as JSON array
  whatsappPhoneId: varchar("whatsappPhoneId", { length: 255 }),
  whatsappAccessToken: varchar("whatsappAccessToken", { length: 500 }),
  emailSenderAddress: varchar("emailSenderAddress", { length: 255 }),
  emailSenderName: varchar("emailSenderName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = typeof agents.$inferInsert;

/**
 * Client/Contact table - stores information about clients interacting with agents
 */
export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").notNull(),
  businessId: int("businessId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  whatsappPhone: varchar("whatsappPhone", { length: 20 }),
  preferredContactMethod: mysqlEnum("preferredContactMethod", ["email", "whatsapp", "phone"]).default("email"),
  tags: json("tags"), // JSON array of tags
  notes: text("notes"),
  lastInteractionAt: timestamp("lastInteractionAt"),
  satisfactionScore: int("satisfactionScore"), // 1-5 scale
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

/**
 * Chat Message table - stores conversation history
 */
export const chatMessages = mysqlTable("chatMessages", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").notNull(),
  clientId: int("clientId").notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  metadata: json("metadata"), // Store additional data like sentiment, intent, etc.
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

/**
 * Appointment/Booking table
 */
export const appointments = mysqlTable("appointments", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;

/**
 * Notification/Reminder table - tracks sent notifications
 */
export const notifications = mysqlTable("notifications", {
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
  externalId: varchar("externalId", { length: 255 }), // For tracking with external services
  errorMessage: text("errorMessage"),
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Analytics/Metrics table - stores aggregated analytics data
 */
export const analytics = mysqlTable("analytics", {
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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Analytics = typeof analytics.$inferSelect;
export type InsertAnalytics = typeof analytics.$inferInsert;

/**
 * Subscription/Payment table - tracks subscription transactions
 */
export const subscriptions = mysqlTable("subscriptions", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

/**
 * Invoice table - tracks payment invoices
 */
export const invoices = mysqlTable("invoices", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;

/**
 * Activity Log table - tracks user actions for audit purposes
 */
export const activityLogs = mysqlTable("activityLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  businessId: int("businessId").notNull(),
  action: varchar("action", { length: 255 }).notNull(),
  entityType: varchar("entityType", { length: 100 }),
  entityId: int("entityId"),
  details: json("details"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = typeof activityLogs.$inferInsert;
