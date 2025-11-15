/**
 * Stripe Product Configuration
 * Define all subscription plans and products here
 */

export const STRIPE_PRODUCTS = {
  FREE: {
    name: "Free",
    description: "Perfect for getting started",
    price: 0,
    features: ["1 AI Agent", "Up to 100 chats/month", "Basic analytics", "Email support"],
  },
  STARTER: {
    name: "Starter",
    description: "For small businesses",
    price: 2900, // $29.00 in cents
    currency: "usd",
    interval: "month",
    features: [
      "Up to 5 AI Agents",
      "Up to 5,000 chats/month",
      "Advanced analytics",
      "WhatsApp integration",
      "Priority support",
    ],
  },
  PRO: {
    name: "Pro",
    description: "For growing teams",
    price: 9900, // $99.00 in cents
    currency: "usd",
    interval: "month",
    features: [
      "Unlimited AI Agents",
      "Unlimited chats",
      "Custom branding",
      "API access",
      "24/7 phone support",
    ],
  },
  ENTERPRISE: {
    name: "Enterprise",
    description: "For large organizations",
    price: null, // Custom pricing
    currency: "usd",
    interval: "month",
    features: [
      "Everything in Pro",
      "Dedicated account manager",
      "Custom integrations",
      "SLA guarantee",
      "On-premise deployment option",
    ],
  },
};

export const SUBSCRIPTION_PLANS = [
  {
    id: "starter_monthly",
    name: "Starter Monthly",
    plan: "starter",
    price: 2900,
    currency: "usd",
    interval: "month",
    intervalCount: 1,
  },
  {
    id: "starter_yearly",
    name: "Starter Yearly",
    plan: "starter",
    price: 29900, // $299.00 - 15% discount
    currency: "usd",
    interval: "year",
    intervalCount: 1,
  },
  {
    id: "pro_monthly",
    name: "Pro Monthly",
    plan: "pro",
    price: 9900,
    currency: "usd",
    interval: "month",
    intervalCount: 1,
  },
  {
    id: "pro_yearly",
    name: "Pro Yearly",
    plan: "pro",
    price: 99900, // $999.00 - 15% discount
    currency: "usd",
    interval: "year",
    intervalCount: 1,
  },
];

export function getPlanFeatures(plan: string): string[] {
  const planKey = plan.toUpperCase() as keyof typeof STRIPE_PRODUCTS;
  return STRIPE_PRODUCTS[planKey]?.features || [];
}

export function getPlanPrice(plan: string): number {
  const planKey = plan.toUpperCase() as keyof typeof STRIPE_PRODUCTS;
  return STRIPE_PRODUCTS[planKey]?.price || 0;
}
