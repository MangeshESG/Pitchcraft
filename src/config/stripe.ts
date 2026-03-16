import { loadStripe } from "@stripe/stripe-js";

// Environment-based Stripe configuration
const STRIPE_PUBLISHABLE_KEY = process.env.NODE_ENV === 'production' 
  ? "pk_live_51SJCuRFNcXTjravQ7KGvF9oNuYEAMKJNd7EkYdvOHTyLX63R7YY92DryJzECjetGm9VQaa34wAnjPWOxNQd0oC2W00F2HOLLhF"
  : "pk_test_51SMm5UHDCkj9hBmZl4yRaVsoNfGevHcE3aceEogIAULDMp6EibUTAZ6dCOsfimlofEUBRbwiisKPt0IOBjkvEWVm00OhJDFN0r";

// Create Stripe promise with error handling
export const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY).catch((error) => {
  console.error("Failed to load Stripe.js:", error);
  return null;
});

export { STRIPE_PUBLISHABLE_KEY };