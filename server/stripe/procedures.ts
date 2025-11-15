import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import Stripe from "stripe";
import { getBusinessById, updateBusiness } from "../db";
import { SUBSCRIPTION_PLANS } from "./products";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

export const stripeRouter = router({
  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        businessId: z.number(),
        planId: z.string(),
        successUrl: z.string().url(),
        cancelUrl: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const business = await getBusinessById(input.businessId);
      if (!business) {
        throw new Error("Business not found");
      }

      const plan = SUBSCRIPTION_PLANS.find((p) => p.id === input.planId);
      if (!plan) {
        throw new Error("Plan not found");
      }

      try {
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          mode: "subscription",
          customer_email: ctx.user.email || undefined,
          client_reference_id: ctx.user.id.toString(),
          metadata: {
            user_id: ctx.user.id.toString(),
            business_id: input.businessId.toString(),
            plan: plan.plan,
            billing_cycle: plan.interval,
          },
          line_items: [
            {
              price_data: {
                currency: plan.currency,
                product_data: {
                  name: plan.name,
                  description: `SmartServe AI - ${plan.name} Plan`,
                },
                unit_amount: plan.price,
                recurring: {
                  interval: plan.interval as "month" | "year",
                  interval_count: plan.intervalCount,
                },
              },
              quantity: 1,
            },
          ],
          success_url: input.successUrl,
          cancel_url: input.cancelUrl,
          allow_promotion_codes: true,
        });

        return {
          sessionId: session.id,
          url: session.url,
        };
      } catch (error: any) {
        console.error("[Stripe] Error creating checkout session:", error);
        throw new Error(error.message || "Failed to create checkout session");
      }
    }),

  getSubscriptionStatus: protectedProcedure
    .input(z.object({ businessId: z.number() }))
    .query(async ({ input }) => {
      const business = await getBusinessById(input.businessId);
      if (!business) {
        throw new Error("Business not found");
      }

      if (!business.stripeCustomerId) {
        return {
          plan: "free",
          status: "inactive",
          subscriptionId: null,
        };
      }

      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: business.stripeCustomerId,
          limit: 1,
          status: "all",
        });

        if (subscriptions.data.length === 0) {
          return {
            plan: "free",
            status: "inactive",
            subscriptionId: null,
          };
        }

        const subscription = subscriptions.data[0];
        return {
          plan: business.subscriptionPlan,
          status: subscription.status,
          subscriptionId: subscription.id,
          currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
          currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
        };
      } catch (error: any) {
        console.error("[Stripe] Error fetching subscription:", error);
        throw new Error("Failed to fetch subscription status");
      }
    }),

  cancelSubscription: protectedProcedure
    .input(z.object({ businessId: z.number() }))
    .mutation(async ({ input }) => {
      const business = await getBusinessById(input.businessId);
      if (!business) {
        throw new Error("Business not found");
      }

      if (!business.stripeCustomerId) {
        throw new Error("No active subscription found");
      }

      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: business.stripeCustomerId,
          status: "active",
          limit: 1,
        });

        if (subscriptions.data.length === 0) {
          throw new Error("No active subscription found");
        }

        const subscription = subscriptions.data[0];
        await stripe.subscriptions.cancel(subscription.id);

        // Update business status
        await updateBusiness(input.businessId, {
          subscriptionStatus: "cancelled",
        });

        return {
          success: true,
          message: "Subscription cancelled successfully",
        };
      } catch (error: any) {
        console.error("[Stripe] Error cancelling subscription:", error);
        throw new Error(error.message || "Failed to cancel subscription");
      }
    }),

  updatePaymentMethod: protectedProcedure
    .input(z.object({ businessId: z.number() }))
    .mutation(async ({ input }) => {
      const business = await getBusinessById(input.businessId);
      if (!business) {
        throw new Error("Business not found");
      }

      if (!business.stripeCustomerId) {
        throw new Error("No Stripe customer found");
      }

      try {
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          mode: "setup",
          customer: business.stripeCustomerId,
          success_url: `${process.env.VITE_FRONTEND_URL || "http://localhost:3000"}/dashboard?payment=success`,
          cancel_url: `${process.env.VITE_FRONTEND_URL || "http://localhost:3000"}/dashboard?payment=cancelled`,
        });

        return {
          sessionId: session.id,
          url: session.url,
        };
      } catch (error: any) {
        console.error("[Stripe] Error creating setup session:", error);
        throw new Error("Failed to create payment method setup session");
      }
    }),

  getInvoices: protectedProcedure
    .input(z.object({ businessId: z.number() }))
    .query(async ({ input }) => {
      const business = await getBusinessById(input.businessId);
      if (!business) {
        throw new Error("Business not found");
      }

      if (!business.stripeCustomerId) {
        return [];
      }

      try {
        const invoices = await stripe.invoices.list({
          customer: business.stripeCustomerId,
          limit: 100,
        });

        return invoices.data.map((invoice) => ({
          id: invoice.id,
          number: invoice.number,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          status: invoice.status,
          date: new Date(invoice.created * 1000),
          pdfUrl: (invoice as any).pdf,
          dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
        }));
      } catch (error: any) {
        console.error("[Stripe] Error fetching invoices:", error);
        throw new Error("Failed to fetch invoices");
      }
    }),
});
