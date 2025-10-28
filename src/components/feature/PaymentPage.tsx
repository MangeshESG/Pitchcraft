import React, { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import API_BASE_URL from "../../config";

const stripePromise = loadStripe("pk_test_51SMm5UHDCkj9hBmZl4yRaVsoNfGevHcE3aceEogIAULDMp6EibUTAZ6dCOsfimlofEUBRbwiisKPt0IOBjkvEWVm00OhJDFN0r"); // ✅ apna publishable key

function CheckoutForm({ clientSecret }: { clientSecret: string }) {
    const stripe = useStripe();
    const elements = useElements();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (!stripe || !elements) return;

        const result = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: "https://groupji.co/payment-success", // redirect after success
            },
        });

        if (result.error) {
            alert(result.error.message);
        }

        setLoading(false);
    };

    return (
        <form onSubmit={handleSubmit}>
            <PaymentElement />
            <button
                type="submit"
                disabled={loading || !stripe}
                className="mt-4 bg-green-600 text-white px-4 py-2 rounded w-full"
            >
                {loading ? "Processing..." : "Pay Now"}
            </button>
        </form>
    );
}

export default function PaymentPage({ userId, planName, amount }: any) {
    const [clientSecret, setClientSecret] = useState("");

    useEffect(() => {
        fetch(`${API_BASE_URL}/api/stripe/create-payment-intent`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, planName, amount }),
        })
            .then((res) => res.json())
            .then((data) => setClientSecret(data.clientSecret));
    }, [userId, planName, amount]);

    const options = { clientSecret };

    return (
        <div className="flex justify-center items-center h-screen bg-gray-100">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-[400px]">
                <h2 className="text-2xl font-bold mb-4 text-center">Complete Payment</h2>
                {clientSecret ? (
                    <Elements stripe={stripePromise} options={options}>
                        <CheckoutForm clientSecret={clientSecret} />
                    </Elements>
                ) : (
                    <p>Loading payment form...</p>
                )}
            </div>
        </div>
    );
}
