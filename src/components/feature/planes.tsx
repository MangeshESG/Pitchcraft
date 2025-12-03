import React, { useState } from "react";
import "./planes.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCloudDownloadAlt } from "@fortawesome/free-solid-svg-icons";
import { useSelector } from "react-redux";
import { RootState } from "../../Redux/store";
import AeroplaneImg from "../../assets/images/aeroplane.png";
import RocketImg from "../../assets/images/rocket.png";
import PetrolPumpImg from "../../assets/images/petrol-pump.png";
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
  {
    icon: PetrolPumpImg,
    title: "Pay-as-you-go",
    price: 0.20,
    period: "/credit",
    features: [
      "No monthly commitment",
      "Purchase any amount of credits",
      "Credits never expire",
      "Same features as Premium",
      "Perfect for occasional use",
      "Minimum purchase: 100 credits ($20)",
    ],
    buttonText: "Buy credits",
    planCode: "credits",
  },
];

// ✅ Payment Form Component
function PaymentForm({ clientSecret, selectedPlan, onGoBack }: { clientSecret: string; selectedPlan: Plan; onGoBack: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [paymentMethod, setPaymentMethod] = useState('credit-card');


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    const result = await stripe.confirmPayment({
      elements,
      // confirmParams: {
      //   return_url: window.location.origin + "/payment-success",
      // },
      redirect: "if_required",
    });

    if (result.error) {
      setMessage(result.error.message || "Payment failed");
    } else if (result.paymentIntent?.status === "succeeded") {
      setMessage("✅ Payment successful!");
      // setTimeout(() => {
      //   window.location.href = "/main";
      // }, 2000);
      setTimeout(() => {
      onGoBack();            // close payment form
      window.location.reload(); // optional: refresh data
    }, 1500);
  
    }

    setLoading(false);
  };

  return (
    <div className="w-full bg-gray-100 rounded-lg p-6" data-secure="true">
      <div className="flex items-start justify-center py-4">
        {/* other window page  */}
        <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full mx-4 p-8">
        <div className="flex gap-8">
          {/* Left Side - Order Summary */}
          <div className="flex-1">
            <div className="mb-6">
              <button 
                type="button"
                onClick={onGoBack}
                className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
              >
                <span className="mr-2">←</span>
                Go back to order details
              </button>
            </div>

            <div className="mb-6 flex justify-center">
              <img 
                src={pitchLogo} 
                alt="Pitchcraft Logo" 
                className="h-20 w-auto"
              />
            </div>

            <div className="mb-6 mt-8">
              <h3 className="text-lg font-semibold mb-4">Order summary:</h3>
              
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium text-gray-600 text-sm">PACKAGE</th>
                    <th className="text-right py-2 font-medium text-gray-600 text-sm">PRICE</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-3 font-medium">{selectedPlan.title}</td>
                    <td className="py-3 text-right font-semibold">${selectedPlan.price}</td>
                  </tr>
                </tbody>
              </table>
              
              {selectedPlan.features && (
                <div className="mt-4">
                  <h4 className="font-medium text-gray-700 mb-2">Included features:</h4>
                  <ul className="space-y-1">
                    {selectedPlan.features.map((feature, index) => (
                      <li key={index} className="flex items-start text-sm text-gray-600">
                        <span className="text-green-600 mr-2 mt-0.5">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>


          </div>

          {/* Right Side - Checkout Form */}
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-6 text-center">Checkout</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off" data-stripe="true">
              <div>
                <PaymentElement />
              </div>



              <button
                type="submit"
                disabled={loading || !stripe}
                className="w-full text-white font-semibold py-3 px-4 rounded-md mt-6 flex items-center justify-center transition-colors"
                style={{ backgroundColor: '#008508' }}
              >
                <span className="mr-2">🔒</span>
                {loading ? "Processing..." : `Securely Pay $${selectedPlan.price} Now`}
              </button>
            </form>

            {message && (
              <p className="mt-4 text-center text-red-600">{message}</p>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

// ✅ Main Plans Component
const Planes: React.FC = () => {
  const reduxUserId = useSelector((state: RootState) => state.auth.userId);
  const userEmail = useSelector((state: RootState) => state.auth.email); // ✅ Add this
  const effectiveUserId = reduxUserId || "";
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [creditAmount, setCreditAmount] = useState(100);
  const [isYearly, setIsYearly] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [currentInterval, setCurrentInterval] = useState<string | null>(null);
   const [loadingPlanCode, setLoadingPlanCode] = useState<string | null>(null);
const [errorPopup, setErrorPopup] = useState<string | null>(null);
  const fetchCurrentPlan = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/stripe/active/${effectiveUserId}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentPlan(data.plane || null);
        setCurrentInterval(data.interval || null);
      }
    } catch (error) {
      console.error('Error fetching current plan:', error);
    }
  };

  React.useEffect(() => {
    if (effectiveUserId) {
      fetchCurrentPlan();
    }
  }, [effectiveUserId]);

  const handleGoBack = () => {
    setClientSecret(null);
    setSelectedPlan(null);
    setShowCreditsModal(false);
    setLoadingPlanCode(null); 
  };

  const handleTryItNowClick = async (plan: Plan) => {
    if (plan.planCode === "credits") {
      setShowCreditsModal(true);
      return;
    }
   setLoadingPlanCode(plan.planCode);
    try {
      setSelectedPlan(plan);
      const priceId = isYearly ? (plan.title.toLowerCase() === 'standard' ? 'price_1SPgOFHDCkj9hBmZxSnUTzAT' : plan.title.toLowerCase() === 'premium' ? 'price_1SPh0hHDCkj9hBmZXtVBJ1QG' : plan.planCode) : plan.planCode;
      const response = await fetch(`${API_BASE_URL}/api/stripe/create-subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: effectiveUserId,
          priceId: priceId,
          interval: isYearly ? "Yearly" : "Monthly",
        }),
      });

      if (!response.ok) throw new Error("Failed to create subscription");

      const data = await response.json();
      setClientSecret(data.clientSecret);
    } catch (error) {
       console.error("Subscription error:", error);
  setErrorPopup("Error starting subscription. Please try again.");
  setLoadingPlanCode(null); // optional: reset loading spinner
    }
  };

  const handleCreditsPayment = async () => {
    try {
      const customPlan = {
        ...plans[2],
        title: `${creditAmount} Credits`,
        price: creditAmount * 0.20,
      };
      setSelectedPlan(customPlan);
      
      const response = await fetch(`${API_BASE_URL}/api/stripe/create-credit-intent?UserId=${effectiveUserId}&Credits=${creditAmount}`, {
        method: "POST",
        headers: { "accept": "*/*" },
        body: "",
      });

      if (!response.ok) throw new Error("Failed to create payment intent");

      const data = await response.json();
      setClientSecret(data.clientSecret);
      setShowCreditsModal(false);
    } catch (error) {
      console.error("Credits payment error:", error);
      alert("Error processing credits payment. Please try again.");
    }
  };

  if (clientSecret && selectedPlan) {
    const options = {
      clientSecret,
      appearance: {
        theme: 'stripe' as const,
      },
    };
    
    return (
      <Elements stripe={stripePromise} options={options}>
        <PaymentForm clientSecret={clientSecret} selectedPlan={selectedPlan} onGoBack={handleGoBack} />
      </Elements>
    );
  }

  return (
    <div>
      {/* Billing Toggle */}
      <div className="flex justify-center mb-8">
        <div className="bg-gray-100 p-1 rounded-lg flex items-center">
          <button
            onClick={() => setIsYearly(false)}
            className={`px-4 py-2 rounded-md transition-colors ${
              !isYearly ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setIsYearly(true)}
            className={`px-4 py-2 rounded-md transition-colors ${
              isYearly ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600'
            }`}
          >
            Yearly <span className="text-green-600 text-sm font-medium">-20%</span>
          </button>
        </div>
      </div>
      <div className="pricing-table">
        {plans.map((plan, index) => {
          const yearlyPrice = plan.planCode !== 'credits' ? (plan.title.toLowerCase() === 'standard' ? 1899 : plan.title.toLowerCase() === 'premium' ? 2849 : plan.price * 12 * 0.8) : plan.price;
          const displayPrice = isYearly && plan.planCode !== 'credits' ? yearlyPrice : plan.price;
          const displayPeriod = isYearly && plan.planCode !== 'credits' ? '/year' : plan.period;
          const currentBillingType = isYearly ? 'Yearly' : 'Monthly';
          const isExactSamePlan = !!currentPlan && currentPlan.toLowerCase() === plan.title.toLowerCase() && currentInterval?.toLowerCase() === currentBillingType.toLowerCase();
          const canUpgrade = !!currentPlan && (currentPlan.toLowerCase() === 'standard' && plan.title.toLowerCase() === 'premium');
          const canSwitchInterval = !!currentPlan && currentPlan.toLowerCase() === plan.title.toLowerCase() && currentInterval?.toLowerCase() === 'monthly' && currentBillingType.toLowerCase() === 'yearly';
          const cannotBuyAgain = !!currentPlan && currentPlan.toLowerCase() === plan.title.toLowerCase() && plan.title.toLowerCase() !== 'pay-as-you-go';
          const cannotBuy = !!currentPlan && plan.title.toLowerCase() !== 'pay-as-you-go' && ((currentPlan.toLowerCase() === 'premium' && plan.title.toLowerCase() === 'standard') || (currentInterval?.toLowerCase() === 'yearly' && !isYearly) || cannotBuyAgain);
          
          return (
          <div className="card" key={index} title={isExactSamePlan ? 'You already have this plan with same billing' : cannotBuy ? 'Cannot downgrade to lower plan' : canSwitchInterval ? 'Switch billing interval' : ''}>
            <div className="container">
              {plan.icon.startsWith('http') || plan.icon.includes('.') ? (
                <img src={plan.icon} alt={plan.title} className="x mr-10" />
              ) : (
                <div className="x mr-10 text-4xl flex items-center justify-center">{plan.icon}</div>
              )}
              <div className="yz">
                <h3 className="y">{plan.title}</h3>
                <div className="z"> ${Number.isInteger(displayPrice) ? displayPrice : displayPrice.toFixed(2)}</div>
                {isYearly && plan.planCode !== 'credits' && (
                  <div style={{fontSize: '14px', opacity: 0.75, textDecoration: 'line-through'}}>
                    ${(plan.price * 12).toFixed(2)}
                  </div>
                )}
                <div className="A">{displayPeriod}</div>
              </div>
            </div>
            <ul className="features-list">
              {plan.features.map((feature, i) => (
                <li key={i}>
                  <span className="check-icon">✔</span>
                  {feature}
                </li>
              ))}
            </ul>
            <button 
              className={`try-button ${(isExactSamePlan || cannotBuy) ? 'disabled' : ''}`}
              onClick={() => {
                if (isExactSamePlan || cannotBuy) return;
                 setLoadingPlanCode(plan.planCode);
                handleTryItNowClick({...plan, price: displayPrice, period: displayPeriod});
              }}
              disabled={isExactSamePlan || cannotBuy ||loadingPlanCode === plan.planCode}
            >
              <FontAwesomeIcon icon={faCloudDownloadAlt} /> 
              {loadingPlanCode === plan.planCode?"Processing...":isExactSamePlan ? 'Current plan' : cannotBuyAgain ? 'Already purchased this month' : cannotBuy ? 'Cannot downgrade' : canSwitchInterval ? `Switch to ${currentBillingType}` : canUpgrade ? 'Upgrade' : plan.buttonText}
            </button>
          </div>
        )})}
      </div>
               {errorPopup && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
      <h3 className="text-xl font-bold mb-4 text-red-600">Error</h3>

      <p className="text-gray-700 mb-6">
        {errorPopup}
      </p>

      <div className="flex justify-end">
        <button
          onClick={() => setErrorPopup(null)}
          className="px-4 py-2 bg-green-600 text-white rounded-md"
        >
          OK
        </button>
      </div>
    </div>
  </div>
)}

      {/* Credits Selection Modal */}
      {showCreditsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Select credit amount</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of credits (Min: 100)
              </label>
              <input
                type="number"
                min="100"
                step="50"
                value={creditAmount}
                onChange={(e) => setCreditAmount(Math.max(100, parseInt(e.target.value) || 100))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">
                <strong>Total cost:</strong> ${(creditAmount * 0.20).toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Rate: $0.20 per credit
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreditsModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreditsPayment}
                className="flex-1 px-4 py-2 text-white rounded-md"
                style={{ backgroundColor: '#008508' }}
              >
                Continue to payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Planes;
