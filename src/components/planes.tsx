import React, { useEffect, useState } from "react";
import "./planes.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCloudDownloadAlt } from "@fortawesome/free-solid-svg-icons";
import { useSelector } from "react-redux";
import { RootState } from "../Redux/store";
import CustomerCreateForm from "./feature/CustomerCreateForm";
import AeroplaneImg from "../assets/images/aeroplane.png";
import KiteImg from "../assets/images/Kite.png";
import RocketImg from "../assets/images/rocket.png";

type Plan = {
    icon: string;
    title: string;
    price: string;
    period: string;
    features: string[];
    buttonText: string;
    planCode: string;
};

const plans: Plan[] = [
    {
        icon: RocketImg,
        title: "Standard",
        price: "$199",
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
        planCode: "12345",
    },
    {
        icon: AeroplaneImg,
        title: "Premium",
        price: "$299",
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
        planCode: "123456",
    },
];

const Planes: React.FC = () => {
    const reduxUserId = useSelector((state: RootState) => state.auth.userId);

    const selectedClient = ""; // placeholder — replace with real value
    const effectiveUserId = selectedClient !== "" ? selectedClient : reduxUserId;

    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        console.log("User ID from Redux:", reduxUserId);
        console.log("Effective User ID:", effectiveUserId);
    }, [reduxUserId, effectiveUserId]);

    const handleTryItNowClick = async (plan: Plan) => {
        try {
            // Step 1: Check if customer exists
            const response = await fetch(
                `https://localhost:7216/api/Plane/get-Customers?clientId=${effectiveUserId}`
            );

            if (!response.ok) throw new Error(`API error: ${response.status}`);

            const text = await response.text();

            if (!text || text === "null" || text === "undefined") {
                // No customer in DB → show form
                console.log("No customer found, showing form");
                setShowForm(true);
                return;
            }

            const data = JSON.parse(text);
            console.log("Customer API Response:", data);

            if (data?.customerId) {
                // ✅ Customer exists → create subscription
                const subRes = await fetch(
                    `https://localhost:7216/api/Plane/new-subscription?clientId=${effectiveUserId}`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            customer_id: data.customerId, // make sure key matches your API
                            customer: {
                                display_name: data.contactName,
                                email: data.email,
                            },
                            plan: {
                                plan_code: plan.planCode,
                                quantity: 1,
                            },
                            payment_gateways: [{ payment_gateway: "stripe" }],
                        }),
                    }
                );

                if (!subRes.ok) throw new Error("Subscription API failed");

                const subData = await subRes.json();

                if (subData?.url) {
                    window.location.href = subData.url; // 👈 navigate to API returned URL
                } else {
                    alert(`✅ ${plan.title} subscription created successfully!`);
                }
            } else {
                console.log("Customer not found in response → show form");
                setShowForm(true);
            }
        } catch (error) {
            console.error("Error in Try it Now flow:", error);
            setShowForm(true); // fallback → show form
        }
    };

    return (
        <div>
            {showForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-auto">
                    <div className="bg-white p-6 rounded-lg shadow-lg max-w-5xl max-h-[98vh] w-full relative overflow-y-auto">
                        {/* Close button */}
                        <button
                            className="absolute top-2 right-2 text-gray-600 hover:text-gray-900 text-xl font-bold"
                            onClick={() => setShowForm(false)}
                        >
                            ✖
                        </button>
                        {/* Customer form */}
                        <CustomerCreateForm />
                    </div>
                </div>
            )}

            <div className="pricing-table">
                {plans.map((plan, index) => (
                    <div className="card" key={index}>
                        {/* <div className="card-header">
                            <div className="title-row">
                                 <img src={plan.icon} alt={plan.title} className="w-12 h-12 mr-10 rounded-md" />
                                <h3>{plan.title}</h3>
                            </div>
                            <div className="price-row">
                                <span className="amount">{plan.price}</span>
                                <span className="period">{plan.period}</span>
                            </div>
                        </div> */}
                        <div className="container">
                            <img src={plan.icon} alt={plan.title} className="x  mr-10" />
                            <div className="yz">
                                <h3 className="y">{plan.title}</h3>
                                <span className="z">{plan.price}</span>
                            </div>
                            <div className="A">{plan.period}</div>
                        </div>
                        {/* <ul>
                            {plan.features.map((feature, i) => (
                                <li key={i}>{feature}</li>
                            ))}
                        </ul> */}
                        <ul className="features-list">
                            {plan.features.map((feature, i) => (
                                <li key={i}>
                                    <span className="check-icon">✔</span>
                                    {feature}
                                </li>
                            ))}
                        </ul>

                        <button
                            className="try-button"
                            onClick={() => handleTryItNowClick(plan)}
                        >
                            <FontAwesomeIcon icon={faCloudDownloadAlt} /> {plan.buttonText}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Planes;
