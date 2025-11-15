import { Request, Response } from "express";
import Stripe from "stripe";
import { getDb } from "../db";
import { updateBusiness, createSubscription, createInvoice } from "../db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export async function handleStripeWebhook(req: Request, res: Response) {
  const signature = req.headers["stripe-signature"] as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (error: any) {
    console.error("[Stripe Webhook] Signature verification failed:", error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  // Handle test events
  if (event.id.startsWith("evt_test_")) {
    console.log("[Webhook] Test event detected, returning verification response");
    return res.json({
      verified: true,
    });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "customer.subscription.created":
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error("[Stripe Webhook] Error processing event:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log("[Stripe] Checkout session completed:", session.id);

  const userId = parseInt(session.metadata?.user_id || "0");
  const businessId = parseInt(session.metadata?.business_id || "0");
  const plan = session.metadata?.plan || "starter";
  const billingCycle = session.metadata?.billing_cycle || "monthly";

  if (!userId || !businessId) {
    console.error("[Stripe] Missing user_id or business_id in metadata");
    return;
  }

  try {
    // Update business subscription status
    await updateBusiness(businessId, {
      subscriptionPlan: plan as "starter" | "free" | "pro" | "enterprise",
      subscriptionStatus: "active",
      stripeCustomerId: session.customer as string,
    });

    // Create subscription record
    await createSubscription({
      businessId,
      plan: plan as any,
      billingCycle: billingCycle as any,
      amount: String(session.amount_total || 0),
      stripeSubscriptionId: session.subscription as string,
      status: "active",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    console.log(`[Stripe] Subscription created for business ${businessId}`);
  } catch (error) {
    console.error("[Stripe] Error handling checkout session:", error);
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log("[Stripe] Subscription created:", subscription.id);
  // Additional logic if needed
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log("[Stripe] Subscription updated:", subscription.id);

  // Update subscription status in database if needed
  const db = await getDb();
  if (db) {
    try {
      // Find and update subscription by Stripe ID
      // This would require a query helper - implement as needed
      console.log(`[Stripe] Subscription ${subscription.id} status: ${subscription.status}`);
    } catch (error) {
      console.error("[Stripe] Error updating subscription:", error);
    }
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log("[Stripe] Subscription deleted:", subscription.id);

  // Mark subscription as cancelled in database
  try {
    // Find subscription by Stripe ID and mark as cancelled
    console.log(`[Stripe] Subscription ${subscription.id} cancelled`);
  } catch (error) {
    console.error("[Stripe] Error handling subscription deletion:", error);
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  console.log("[Stripe] Invoice paid:", invoice.id);

  try {
    // Create invoice record in database
    const subscriptionId = (invoice as any).subscription as string | undefined;
    if (subscriptionId) {
      // Store invoice details
      console.log(`[Stripe] Invoice ${invoice.id} paid for subscription ${subscriptionId}`);
    } else {
      console.log(`[Stripe] Invoice ${invoice.id} paid (no subscription)`);
    }
  } catch (error) {
    console.error("[Stripe] Error handling paid invoice:", error);
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log("[Stripe] Invoice payment failed:", invoice.id);

  try {
    // Mark invoice as failed and notify customer
    console.log(`[Stripe] Invoice ${invoice.id} payment failed`);
  } catch (error) {
    console.error("[Stripe] Error handling failed invoice:", error);
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log("[Stripe] Payment intent succeeded:", paymentIntent.id);

  try {
    // Log successful payment
    console.log(`[Stripe] Payment ${paymentIntent.id} succeeded for amount ${paymentIntent.amount}`);
  } catch (error) {
    console.error("[Stripe] Error handling succeeded payment:", error);
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log("[Stripe] Payment intent failed:", paymentIntent.id);

  try {
    // Log failed payment and notify customer
    console.log(`[Stripe] Payment ${paymentIntent.id} failed`);
  } catch (error) {
    console.error("[Stripe] Error handling failed payment:", error);
  }
}
