import React from "react";

interface TabsProps {
  tabs: string[];
  selectedTab: string;
  onTabChange: (tab: string) => void;
}

const Tabs: React.FC<TabsProps> = ({ tabs, selectedTab, onTabChange }) => {
  return (
    <div className="tabs secondary">
      <ul className="d-flex">
        {tabs.map((tab) => (
          <li key={tab}>
            <button
              onClick={() => onTabChange(tab)}
              className={`button ${selectedTab === tab ? "active" : ""}`}
            >
              {tab}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Tabs;
