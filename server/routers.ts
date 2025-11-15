import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import {
  createBusiness,
  getBusinessById,
  getBusinessesByUserId,
  updateBusiness,
  createAgent,
  getAgentById,
  getAgentsByBusinessId,
  updateAgent,
  deleteAgent,
  createClient,
  getClientById,
  getClientsByAgentId,
  getClientsByBusinessId,
  updateClient,
  searchClients,
  createChatMessage,
  getChatHistoryByClientId,
  getChatHistoryByAgentAndClient,
  createAppointment,
  getAppointmentById,
  getAppointmentsByAgentId,
  getAppointmentsByClientId,
  getUpcomingAppointments,
  updateAppointment,
  createNotification,
  getPendingNotifications,
  updateNotification,
  getAnalyticsByAgentAndDate,
  createOrUpdateAnalytics,
  getSubscriptionByBusinessId,
  createSubscription,
  updateSubscription,
  getInvoicesByBusinessId,
  createInvoice,
  updateInvoice,
  createActivityLog,
  getActivityLogsByBusinessId,
} from "./db";
import { invokeLLM } from "./_core/llm";

export const appRouter = router({
  system: systemRouter,

  // ============ AUTH ROUTES ============
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ============ BUSINESS ROUTES ============
  business: router({
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          description: z.string().optional(),
          industry: z.string().optional(),
          website: z.string().optional(),
          phone: z.string().optional(),
          address: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const result = await createBusiness({
          userId: ctx.user.id,
          name: input.name,
          description: input.description,
          industry: input.industry,
          website: input.website,
          phone: input.phone,
          address: input.address,
          subscriptionPlan: "free",
          subscriptionStatus: "inactive",
        });
        return result;
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getBusinessById(input.id);
      }),

    getMyBusinesses: protectedProcedure.query(async ({ ctx }) => {
      return await getBusinessesByUserId(ctx.user.id);
    }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          description: z.string().optional(),
          industry: z.string().optional(),
          website: z.string().optional(),
          phone: z.string().optional(),
          address: z.string().optional(),
          logo: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        await updateBusiness(input.id, input);
        return { success: true };
      }),
  }),

  // ============ AGENT ROUTES ============
  agent: router({
    create: protectedProcedure
      .input(
        z.object({
          businessId: z.number(),
          name: z.string().min(1),
          description: z.string().optional(),
          systemPrompt: z.string().optional(),
          welcomeMessage: z.string().optional(),
          businessHoursStart: z.string().optional(),
          businessHoursEnd: z.string().optional(),
          businessHoursTimezone: z.string().optional(),
          businessHoursEnabled: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
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
          status: "active",
        });
        return result;
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getAgentById(input.id);
      }),

    getByBusinessId: protectedProcedure
      .input(z.object({ businessId: z.number() }))
      .query(async ({ input }) => {
        return await getAgentsByBusinessId(input.businessId);
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          description: z.string().optional(),
          systemPrompt: z.string().optional(),
          welcomeMessage: z.string().optional(),
          businessHoursStart: z.string().optional(),
          businessHoursEnd: z.string().optional(),
          businessHoursTimezone: z.string().optional(),
          businessHoursEnabled: z.boolean().optional(),
          faqData: z.any().optional(),
          whatsappPhoneId: z.string().optional(),
          whatsappAccessToken: z.string().optional(),
          emailSenderAddress: z.string().optional(),
          emailSenderName: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateAgent(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteAgent(input.id);
        return { success: true };
      }),

    uploadFAQ: protectedProcedure
      .input(
        z.object({
          agentId: z.number(),
          faqs: z.array(
            z.object({
              question: z.string(),
              answer: z.string(),
            })
          ),
        })
      )
      .mutation(async ({ input }) => {
        await updateAgent(input.agentId, {
          faqData: input.faqs,
        });
        return { success: true };
      }),
  }),

  // ============ CLIENT ROUTES ============
  clientData: router({
    create: protectedProcedure
      .input(
        z.object({
          agentId: z.number(),
          businessId: z.number(),
          name: z.string().min(1),
          email: z.string().optional(),
          phone: z.string().optional(),
          whatsappPhone: z.string().optional(),
          preferredContactMethod: z
            .enum(["email", "whatsapp", "phone"])
            .optional(),
        })
      )
      .mutation(async ({ input }) => {
        const result = await createClient({
          agentId: input.agentId,
          businessId: input.businessId,
          name: input.name,
          email: input.email,
          phone: input.phone,
          whatsappPhone: input.whatsappPhone,
          preferredContactMethod: input.preferredContactMethod,
        });
        return result;
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getClientById(input.id);
      }),

    getByAgentId: protectedProcedure
      .input(z.object({ agentId: z.number() }))
      .query(async ({ input }) => {
        return await getClientsByAgentId(input.agentId);
      }),

    getByBusinessId: protectedProcedure
      .input(z.object({ businessId: z.number() }))
      .query(async ({ input }) => {
        return await getClientsByBusinessId(input.businessId);
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          email: z.string().optional(),
          phone: z.string().optional(),
          whatsappPhone: z.string().optional(),
          preferredContactMethod: z
            .enum(["email", "whatsapp", "phone"])
            .optional(),
          tags: z.array(z.string()).optional(),
          notes: z.string().optional(),
          satisfactionScore: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateClient(id, data);
        return { success: true };
      }),

    search: protectedProcedure
      .input(
        z.object({
          businessId: z.number(),
          query: z.string(),
        })
      )
      .query(async ({ input }) => {
        return await searchClients(input.businessId, input.query);
      }),
  }),

  // ============ CHAT ROUTES ============
  chatData: router({
    sendMessage: protectedProcedure
      .input(
        z.object({
          agentId: z.number(),
          clientId: z.number(),
          message: z.string().min(1),
        })
      )
      .mutation(async ({ input }) => {
        // Store user message
        await createChatMessage({
          agentId: input.agentId,
          clientId: input.clientId,
          role: "user",
          content: input.message,
        });

        // Get agent and chat history for context
        const agent = await getAgentById(input.agentId);
        const history = await getChatHistoryByAgentAndClient(
          input.agentId,
          input.clientId,
          20
        );

        if (!agent) throw new Error("Agent not found");

        // Prepare messages for LLM
        const messages = [
          {
            role: "system" as const,
            content:
              agent.systemPrompt ||
              "You are a helpful customer service assistant.",
          },
          ...history.map((msg) => ({
            role: msg.role as "user" | "assistant" | "system",
            content: msg.content,
          })),
          {
            role: "user" as const,
            content: input.message,
          },
        ];

        // Get AI response
        const response = await invokeLLM({
          messages: messages,
        });

        const messageContent = response.choices[0]?.message?.content;
        const assistantMessage = typeof messageContent === 'string' ? messageContent : "I apologize, I could not generate a response.";

        // Store assistant message
        await createChatMessage({
          agentId: input.agentId,
          clientId: input.clientId,
          role: "assistant",
          content: assistantMessage,
        });

        // Update client last interaction
        await updateClient(input.clientId, {
          lastInteractionAt: new Date(),
        });

        return {
          userMessage: input.message,
          assistantMessage: assistantMessage,
        };
      }),

    getHistory: protectedProcedure
      .input(
        z.object({
          agentId: z.number(),
          clientId: z.number(),
          limit: z.number().optional(),
        })
      )
      .query(async ({ input }) => {
        return await getChatHistoryByAgentAndClient(
          input.agentId,
          input.clientId,
          input.limit || 50
        );
      }),
  }),

  // ============ APPOINTMENT ROUTES ============
  appointmentData: router({
    create: protectedProcedure
      .input(
        z.object({
          agentId: z.number(),
          clientId: z.number(),
          businessId: z.number(),
          title: z.string().min(1),
          description: z.string().optional(),
          startTime: z.date(),
          endTime: z.date(),
          location: z.string().optional(),
          meetingLink: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
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
          status: "scheduled",
        });
        return result;
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getAppointmentById(input.id);
      }),

    getByAgentId: protectedProcedure
      .input(z.object({ agentId: z.number() }))
      .query(async ({ input }) => {
        return await getAppointmentsByAgentId(input.agentId);
      }),

    getByClientId: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => {
        return await getAppointmentsByClientId(input.clientId);
      }),

    getUpcoming: protectedProcedure
      .input(
        z.object({
          businessId: z.number(),
          hoursAhead: z.number().optional(),
        })
      )
      .query(async ({ input }) => {
        return await getUpcomingAppointments(
          input.businessId,
          input.hoursAhead || 24
        );
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().optional(),
          description: z.string().optional(),
          startTime: z.date().optional(),
          endTime: z.date().optional(),
          status: z
            .enum(["scheduled", "confirmed", "completed", "cancelled", "no-show"])
            .optional(),
          location: z.string().optional(),
          meetingLink: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateAppointment(id, data);
        return { success: true };
      }),
  }),

  // ============ NOTIFICATION ROUTES ============
  notificationData: router({
    getPending: protectedProcedure.query(async () => {
      return await getPendingNotifications();
    }),

    markAsSent: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await updateNotification(input.id, {
          status: "sent",
          sentAt: new Date(),
        });
        return { success: true };
      }),

    markAsFailed: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          errorMessage: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        await updateNotification(input.id, {
          status: "failed",
          errorMessage: input.errorMessage,
        });
        return { success: true };
      }),
  }),

  // ============ ANALYTICS ROUTES ============
  analyticsData: router({
    getByAgentAndDate: protectedProcedure
      .input(
        z.object({
          agentId: z.number(),
          date: z.date(),
        })
      )
      .query(async ({ input }) => {
        return await getAnalyticsByAgentAndDate(input.agentId, input.date);
      }),

    update: protectedProcedure
      .input(
        z.object({
          agentId: z.number(),
          businessId: z.number(),
          date: z.date(),
          totalChats: z.number().optional(),
          totalMessages: z.number().optional(),
          totalAppointments: z.number().optional(),
          completedAppointments: z.number().optional(),
          cancelledAppointments: z.number().optional(),
          averageSatisfactionScore: z.number().optional(),
          totalClients: z.number().optional(),
          newClients: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        await createOrUpdateAnalytics({
          agentId: input.agentId,
          businessId: input.businessId,
          date: input.date,
          totalChats: input.totalChats,
          totalMessages: input.totalMessages,
          totalAppointments: input.totalAppointments,
          completedAppointments: input.completedAppointments,
          cancelledAppointments: input.cancelledAppointments,
          averageSatisfactionScore: input.averageSatisfactionScore ? String(input.averageSatisfactionScore) as any : undefined,
          totalClients: input.totalClients,
          newClients: input.newClients,
        });
        return { success: true };
      }),
  }),

  // ============ SUBSCRIPTION ROUTES ============
  subscriptionData: router({
    getByBusinessId: protectedProcedure
      .input(z.object({ businessId: z.number() }))
      .query(async ({ input }) => {
        return await getSubscriptionByBusinessId(input.businessId);
      }),

    create: protectedProcedure
      .input(
        z.object({
          businessId: z.number(),
          plan: z.enum(["free", "starter", "pro", "enterprise"]),
          billingCycle: z.enum(["monthly", "yearly"]),
          amount: z.number(),
          stripeSubscriptionId: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const now = new Date();
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
          amount: String(input.amount) as any,
          stripeSubscriptionId: input.stripeSubscriptionId,
          status: "active",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        });
        return result;
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          plan: z.enum(["free", "starter", "pro", "enterprise"]).optional(),
          status: z
            .enum(["active", "inactive", "cancelled", "expired"])
            .optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateSubscription(id, data);
        return { success: true };
      }),
  }),

  // ============ INVOICE ROUTES ============
  invoiceData: router({
    getByBusinessId: protectedProcedure
      .input(z.object({ businessId: z.number() }))
      .query(async ({ input }) => {
        return await getInvoicesByBusinessId(input.businessId);
      }),

    create: protectedProcedure
      .input(
        z.object({
          businessId: z.number(),
          subscriptionId: z.number().optional(),
          amount: z.number(),
          currency: z.string().optional(),
          stripeInvoiceId: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const result = await createInvoice({
          businessId: input.businessId,
          subscriptionId: input.subscriptionId,
          amount: String(input.amount) as any,
          currency: input.currency || "USD",
          stripeInvoiceId: input.stripeInvoiceId,
          status: "open",
        });
        return result;
      }),

    markAsPaid: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await updateInvoice(input.id, {
          status: "paid",
          paidAt: new Date(),
        });
        return { success: true };
      }),
  }),

  // ============ ACTIVITY LOG ROUTES ============
  activityLogData: router({
    getByBusinessId: protectedProcedure
      .input(
        z.object({
          businessId: z.number(),
          limit: z.number().optional(),
        })
      )
      .query(async ({ input }) => {
        return await getActivityLogsByBusinessId(input.businessId, input.limit);
      }),

    log: protectedProcedure
      .input(
        z.object({
          businessId: z.number(),
          action: z.string(),
          entityType: z.string().optional(),
          entityId: z.number().optional(),
          details: z.any().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await createActivityLog({
          userId: ctx.user.id,
          businessId: input.businessId,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId,
          details: input.details,
        });
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
