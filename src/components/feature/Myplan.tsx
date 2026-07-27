import React, { useState } from "react";
import Planes from "./planes";
import PlanHistory from "./PlanHistory";

interface MyPlanProps {
  selectedClient?: string | null;
}

const MyPlan: React.FC<MyPlanProps> = ({ selectedClient }) => {
  const [activeTab, setActiveTab] = useState<"plans" | "history">("plans");

  return (
    <div className="min-h-full bg-[#f8fafc]">
      <div className="border-b border-gray-200 bg-white px-6">
        <nav className="flex gap-8" aria-label="Plan tabs">
          <button
            type="button"
            onClick={() => setActiveTab("plans")}
            className={`border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
              activeTab === "plans"
                ? "border-[#3f9f42] text-[#3f9f42]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Plans
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
              activeTab === "history"
                ? "border-[#3f9f42] text-[#3f9f42]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            History
          </button>
        </nav>
      </div>

      <div className="p-2">
        {activeTab === "plans" ? (
          <Planes />
        ) : (
          <PlanHistory selectedClient={selectedClient} />
        )}
      </div>
    </div>
  );
};

export default MyPlan;
