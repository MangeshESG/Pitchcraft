import React from "react";
import "./planes.css";

type Plan = {
    icon: string;
    title: string;
    price: string;
    period: string;
    features: string[];
    buttonText: string;
};

const plans: Plan[] = [
    {
        icon: "🪁",
        title: "Basic",
        price: "$0",
        period: "/month",
        features: [
            "1 template generation",
            "Import up to 2000 contacts",
            "1 campaign",
            "100 hyper-personalized emails per month",
            "Unlimited emails sending & analytics",
        ],
        buttonText: "Try it now",
    },
    {
        icon: "🚀",
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
        buttonText: "Try it now",
    },
    {
        icon: "✈️",
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
        buttonText: "Try it now",
    },
];

const Planes: React.FC = () => {
    return (
        <div className="pricing-table">
            {plans.map((plan, index) => (
                <div className="card" key={index}>
                    <div className="card-header">
                        <div className="icon">{plan.icon}</div>
                        <h3>{plan.title}</h3>
                        <div className="price">
                            <span className="amount">{plan.price}</span>
                            <span className="period">{plan.period}</span>
                        </div>
                    </div>
                    <ul>
                        {plan.features.map((feature, i) => (
                            <li key={i}>✅ {feature}</li>
                        ))}
                    </ul>

                    <button className="try-button">
                        <span className="download-icon">⬇</span> {plan.buttonText}
                    </button>
                </div>
            ))}
        </div>
    );
};


export default Planes;
