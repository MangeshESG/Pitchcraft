import React, { useState } from "react";
import "./planes.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCloudDownloadAlt } from "@fortawesome/free-solid-svg-icons";
import { useSelector } from "react-redux";
import { RootState } from "../../Redux/store";
import AeroplaneImg from "../../assets/images/aeroplane.png";
import RocketImg from "../../assets/images/rocket.png";
import API_BASE_URL from "../../config";
import pitchLogo from "../../assets/images/pitch_logo.png";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

// ✅ Stripe publishable key (replace with your live or test key)
const stripePromise = loadStripe("pk_test_51SMm5UHDCkj9hBmZl4yRaVsoNfGevHcE3aceEogIAULDMp6EibUTAZ6dCOsfimlofEUBRbwiisKPt0IOBjkvEWVm00OhJDFN0r");

export type Plan = {
  icon: string;
  title: string;
  price: number; // USD
  period: string;
  features: string[];
  buttonText: string;
  planCode: string;
};

const plans: Plan[] = [
  {
    icon: RocketImg,
    title: "Standard",
    price: 199,
    period: "/month",
    features: [
      "10 templates generation",
      "Import up to 10,000 contacts",
      "10 campaigns",
      "1000 hyper-personalized emails per month",
      "Unlimited emails sending & analytics",
      "Additional hyper-personalized emails $0.20",
    ],
    buttonText: "Upgrade",
    planCode: "price_1SMmZiHDCkj9hBmZ5u4UA72M",
  },
  {
    icon: AeroplaneImg,
    title: "Premium",
    price: 299,
    period: "/month",
    features: [
      "20 templates generation",
      "Import up to 20,000 contacts",
      "50 campaigns",
      "2000 hyper-personalized emails per month",
      "Unlimited emails sending & analytics",
      "Additional hyper-personalized emails $0.15",
    ],
    buttonText: "Upgrade",
    planCode: "price_1SMmZ6HDCkj9hBmZNyIzVJQL",
  },
];

// ✅ Payment Form Component
function PaymentForm({ clientSecret }: { clientSecret: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // ⚡ stays inside website — no redirect to Stripe page
        return_url: window.location.origin + "/payment-success",
      },
      redirect: "if_required", // prevents auto-redirect
    });

          if (result.error) {
        setMessage(result.error.message || "Payment failed");
      } else if (result.paymentIntent?.status === "succeeded") {
        setMessage("✅ Payment successful!");
        
        // ✅ Redirect to dashboard after short delay
        setTimeout(() => {
          window.location.href = "/main";  // correct dashboard route
        }, 2000);
      }

    setLoading(false);
  };

  return (
    <div
      className="fixed inset-0 bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center min-h-screen relative "
    >
      <img
        src={pitchLogo}
        alt="Pitchcraft Logo"
        style={{
          position: "absolute",
          top: "74px",
          left: "110px",
          height: "92px",
          zIndex: 10,
        }}
      />
      <form
        onSubmit={handleSubmit}
        style={{
          background: "#fff",
          padding: "40px",
          borderRadius: "12px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          width: "683px",
           marginTop: "20px",
        }}
      >
        <PaymentElement />
        <button
          type="submit"
          disabled={!stripe || loading}
          style={{
            marginTop: "20px",
            width: "100%",
            padding: "12px",
            borderRadius: "8px",
            border: "none",
            backgroundColor: "#10B981",
            color: "#fff",
            fontSize: "16px",
            cursor: "pointer",
          }}
        >
          {loading ? "Processing..." : "Pay Now"}
        </button>

        {message && (
          <p style={{ marginTop: "10px", color: "red", textAlign: "center" }}>{message}</p>
        )}
      </form>
    </div>
  );
}

// ✅ Main Plans Component
const Planes: React.FC = () => {
  const reduxUserId = useSelector((state: RootState) => state.auth.userId);
  const userEmail = useSelector((state: RootState) => state.auth.email); // ✅ Add this
  const effectiveUserId = reduxUserId || "";
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const handleTryItNowClick = async (plan: Plan) => {
  try {
    debugger;
     if (!userEmail) {
        alert("User email not found. Please log in again.");
        return;
      }

    const response = await fetch(`${API_BASE_URL}/api/stripe/create-subscription`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: effectiveUserId,
         email: userEmail,
        priceId: plan.planCode,
      }),
    });

    if (!response.ok) throw new Error("Failed to create subscription");

    const data = await response.json();
    setClientSecret(data.clientSecret);
  } catch (error) {
    console.error("Subscription error:", error);
    alert("Error starting subscription. Please try again.");
  }
};

  if (clientSecret) {
    return (
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <PaymentForm clientSecret={clientSecret} />
      </Elements>
    );
  }

  return (
    <div>
      <div className="pricing-table">
        {plans.map((plan, index) => (
          <div className="card" key={index}>
            <div className="container">
              <img src={plan.icon} alt={plan.title} className="x mr-10" />
              <div className="yz">
                <h3 className="y">{plan.title}</h3>
                <span className="z">${plan.price}</span>
              </div>
              <div className="A">{plan.period}</div>
            </div>
            <ul className="features-list">
              {plan.features.map((feature, i) => (
                <li key={i}>
                  <span className="check-icon">✔</span>
                  {feature}
                </li>
              ))}
            </ul>
            <button className="try-button" onClick={() => handleTryItNowClick(plan)}>
              <FontAwesomeIcon icon={faCloudDownloadAlt} /> {plan.buttonText}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Planes;
