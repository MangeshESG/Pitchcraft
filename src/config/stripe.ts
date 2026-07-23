import { loadStripe } from "@stripe/stripe-js";

const STRIPE_PUBLISHABLE_KEY =
  "pk_live_51SJCuRFNcXTjravQ7KGvF9oNuYEAMKJNd7EkYdvOHTyLX63R7YY92DryJzECjetGm9VQaa34wAnjPWOxNQd0oC2W00F2HOLLhF";

// Create Stripe promise with error handling
export const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY).catch((error) => {
  console.error("Failed to load Stripe.js:", error);
  return null;
});

export { STRIPE_PUBLISHABLE_KEY };
