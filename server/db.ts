import { eq, and, desc, asc, gte, lte, like, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  businesses,
  agents,
  clients,
  chatMessages,
  appointments,
  notifications,
  analytics,
  subscriptions,
  invoices,
  activityLogs,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
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

// ============ USER QUERIES ============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ BUSINESS QUERIES ============

export async function createBusiness(data: typeof businesses.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(businesses).values(data);
  return result;
}

export async function getBusinessById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getBusinessesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(businesses)
    .where(eq(businesses.userId, userId));
}

export async function updateBusiness(
  id: number,
  data: Partial<typeof businesses.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(businesses).set(data).where(eq(businesses.id, id));
}

// ============ AGENT QUERIES ============

export async function createAgent(data: typeof agents.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(agents).values(data);
  return result;
}

export async function getAgentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(agents)
    .where(eq(agents.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAgentsByBusinessId(businessId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(agents)
    .where(eq(agents.businessId, businessId))
    .orderBy(desc(agents.createdAt));
}

export async function updateAgent(
  id: number,
  data: Partial<typeof agents.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(agents).set(data).where(eq(agents.id, id));
}

export async function deleteAgent(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.delete(agents).where(eq(agents.id, id));
}

// ============ CLIENT QUERIES ============

export async function createClient(data: typeof clients.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(clients).values(data);
  return result;
}

export async function getClientById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(clients)
    .where(eq(clients.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getClientsByAgentId(agentId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(clients)
    .where(eq(clients.agentId, agentId))
    .orderBy(desc(clients.lastInteractionAt));
}

export async function getClientsByBusinessId(businessId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(clients)
    .where(eq(clients.businessId, businessId))
    .orderBy(desc(clients.lastInteractionAt));
}

export async function updateClient(
  id: number,
  data: Partial<typeof clients.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(clients).set(data).where(eq(clients.id, id));
}

export async function searchClients(businessId: number, query: string) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(clients)
    .where(
      and(
        eq(clients.businessId, businessId),
        like(clients.name, `%${query}%`)
      )
    );
}

// ============ CHAT MESSAGE QUERIES ============

export async function createChatMessage(
  data: typeof chatMessages.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(chatMessages).values(data);
  return result;
}

export async function getChatHistoryByClientId(
  clientId: number,
  limit: number = 50
) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.clientId, clientId))
    .orderBy(asc(chatMessages.createdAt))
    .limit(limit);
}

export async function getChatHistoryByAgentAndClient(
  agentId: number,
  clientId: number,
  limit: number = 50
) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.agentId, agentId),
        eq(chatMessages.clientId, clientId)
      )
    )
    .orderBy(asc(chatMessages.createdAt))
    .limit(limit);
}

// ============ APPOINTMENT QUERIES ============

export async function createAppointment(
  data: typeof appointments.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(appointments).values(data);
  return result;
}

export async function getAppointmentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAppointmentsByAgentId(agentId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(appointments)
    .where(eq(appointments.agentId, agentId))
    .orderBy(desc(appointments.startTime));
}

export async function getAppointmentsByClientId(clientId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(appointments)
    .where(eq(appointments.clientId, clientId))
    .orderBy(desc(appointments.startTime));
}

export async function getUpcomingAppointments(
  businessId: number,
  hoursAhead: number = 24
) {
  const db = await getDb();
  if (!db) return [];

  const now = new Date();
  const future = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

  return await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.businessId, businessId),
        gte(appointments.startTime, now),
        lte(appointments.startTime, future)
      )
    )
    .orderBy(asc(appointments.startTime));
}

export async function updateAppointment(
  id: number,
  data: Partial<typeof appointments.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(appointments)
    .set(data)
    .where(eq(appointments.id, id));
}

// ============ NOTIFICATION QUERIES ============

export async function createNotification(
  data: typeof notifications.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(notifications).values(data);
  return result;
}

export async function getNotificationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(notifications)
    .where(eq(notifications.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getPendingNotifications() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(notifications)
    .where(eq(notifications.status, "pending"))
    .orderBy(asc(notifications.createdAt));
}

export async function updateNotification(
  id: number,
  data: Partial<typeof notifications.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(notifications)
    .set(data)
    .where(eq(notifications.id, id));
}

// ============ ANALYTICS QUERIES ============

export async function getAnalyticsByAgentAndDate(agentId: number, date: Date) {
  const db = await getDb();
  if (!db) return undefined;

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const result = await db
    .select()
    .from(analytics)
    .where(
      and(
        eq(analytics.agentId, agentId),
        gte(analytics.date, startOfDay),
        lte(analytics.date, endOfDay)
      )
    )
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createOrUpdateAnalytics(
  data: typeof analytics.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .insert(analytics)
    .values(data)
    .onDuplicateKeyUpdate({ set: data });
}

// ============ SUBSCRIPTION QUERIES ============

export async function getSubscriptionByBusinessId(businessId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.businessId, businessId))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createSubscription(
  data: typeof subscriptions.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(subscriptions).values(data);
  return result;
}

export async function updateSubscription(
  id: number,
  data: Partial<typeof subscriptions.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(subscriptions)
    .set(data)
    .where(eq(subscriptions.id, id));
}

// ============ INVOICE QUERIES ============

export async function getInvoicesByBusinessId(businessId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(invoices)
    .where(eq(invoices.businessId, businessId))
    .orderBy(desc(invoices.createdAt));
}

export async function createInvoice(data: typeof invoices.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(invoices).values(data);
  return result;
}

export async function updateInvoice(
  id: number,
  data: Partial<typeof invoices.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(invoices).set(data).where(eq(invoices.id, id));
}

// ============ ACTIVITY LOG QUERIES ============

export async function createActivityLog(
  data: typeof activityLogs.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(activityLogs).values(data);
}

export async function getActivityLogsByBusinessId(
  businessId: number,
  limit: number = 100
) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(activityLogs)
    .where(eq(activityLogs.businessId, businessId))
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit);
}
