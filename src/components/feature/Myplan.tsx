import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import PlanHistory from "./PlanHistory"; // ✅ make sure the path is correct
import Planes from "./planes";

const tabs = [
  "Account usage",
  "Upgrade Plan",
  "Billing history",
];

const MyPlan: React.FC = () => {
  const [activeTab, setActiveTab] = useState("Upgrade Plan");
  const navigate = useNavigate();

  const handleTabClick = (selectedTab: string) => {
    setActiveTab(selectedTab);

    // if (selectedTab === "Upgrade Plan") {
    //   navigate("/planes");
    // }
    // ❌ remove navigation for Billing history
  };

  return (
    <div className="p-2" style={{marginTop:"-70px"}}>
      {/* Tabs */}
      <div className="flex space-x-8 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabClick(tab)}
            className={`pb-3 text-sm font-medium ${activeTab === tab
                ? "text-[#3f9f42] border-b-2 border-[#3f9f42]"
                : "text-gray-700 hover:text-[#3f9f42] hover:border-b-2 hover:border-[#3f9f42]"
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ✅ Tab Content */}
      <div className="mt-6">
        {activeTab === "Account usage" && (
          <p className="text-gray-600">Account usage details here...</p>
        )}

        {activeTab === "Upgrade Plan" && (
          <p className="text-gray-600"></p>
        )}

        {activeTab === "Billing history" && (
          <p className="text-gray-600"></p>
        )}

        {/* ✅ Show PlanHistory component below tabs */}
        {activeTab === "Billing history" && (
          <div className="pt-6 border-t border-gray-200">
            <PlanHistory />
          </div>
        )}
        {activeTab === "Upgrade Plan" && (
          <div className="pt-6 border-t border-gray-200">
            <Planes />
          </div>
        )}
      </div>
    </div>
  );
};

export default MyPlan;
