import React, { useEffect, useState } from "react";
import "./planes.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCloudDownloadAlt } from "@fortawesome/free-solid-svg-icons";
import { useSelector } from "react-redux";
import { RootState } from "../../Redux/store";
import CustomerCreateForm from "./CustomerCreateForm";
import AeroplaneImg from "../../assets/images/aeroplane.png";
import KiteImg from "../../assets/images/Kite.png";
import RocketImg from "../../assets/images/rocket.png";
import API_BASE_URL from "../../config";
import { useNavigate } from "react-router-dom";
import pitchLogo from "../../assets/images/pitch_logo.png";

export type Plan = {
    icon: string;
    title: string;
    price: string;
    period: string;
    features: string[];
    buttonText: string;
    planCode: string;
};
interface CustomerCreateFormProps {
    plan: Plan | null;
    clientId: string;
}

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
    //const effectiveUserId = selectedClient !== "" ? selectedClient : reduxUserId;
    const effectiveUserId: string = selectedClient !== "" ? selectedClient : reduxUserId || "";

    const [showForm, setShowForm] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
    const navigate = useNavigate();
    const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

    useEffect(() => {
        console.log("User ID from Redux:", reduxUserId);
        console.log("Effective User ID:", effectiveUserId);
    }, [reduxUserId, effectiveUserId]);

    const handleTryItNowClick = async (plan: Plan) => {
        setSelectedPlan(plan);
        try {
            // Step 1: Check if customer exists
            const response = await fetch(
                `${API_BASE_URL}/api/Plane/get-Customers?clientId=${effectiveUserId}`
            );

            if (!response.ok) throw new Error(`API error: ${response.status}`);

            const text = await response.text();

            if (!text || text === "null" || text === "undefined") {
                // No customer in DB → show form
                console.log("No customer found, showing form");
                // setShowForm(true);
                navigate("/create-customer", { state: { plan, clientId: effectiveUserId } });
                return;
            }

            const data = JSON.parse(text);
            console.log("Customer API Response:", data);

            if (data?.customerId) {
                // ✅ Customer exists → create subscription
                const subRes = await fetch(
                    `${API_BASE_URL}/api/Plane/new-subscription?clientId=${effectiveUserId}`,
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
                    setPaymentUrl(subData.url);
                    //   window.location.href = subData.url; // 👈 navigate to API returned URL
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
    if (paymentUrl) {
        return (
            <div
                className="fixed inset-0 bg-gradient-to-br from-green-50 to-emerald-100"
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden", // ✅ Removes outer scrollbar
                    height: "100vh",
                    position: "relative",
                }}
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
                <iframe
                    src={paymentUrl}
                    title="Payment"
                    style={{
                        border: "none",
                        width: "100%",
                        height: "100vh", // ✅ Full viewport height
                    }}
                />
            </div>
        );
    }
    return (
        <div>
            <div className="pricing-table">
                {plans.map((plan, index) => (
                    <div className="card" key={index}>
                        <div className="container">
                            <img src={plan.icon} alt={plan.title} className="x  mr-10" />
                            <div className="yz">
                                <h3 className="y">{plan.title}</h3>
                                <span className="z">{plan.price}</span>
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
