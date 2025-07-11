import React, { useState } from "react";
import "./MainPage.css";
const prompts = [
  {
    label: "Pitch 1",
    description:
      "This is the description of Pitch 1. A brief but compelling pitch.",
  },
  {
    label: "Pitch 2",
    description: "Pitch 2 focuses on the user experience and innovation.",
  },
  {
    label: "Pitch 3",
    description: "Pitch 3 targets a specific market segment with high demand.",
  },
  {
    label: "Pitch 4",
    description: "This pitch is all about scalability and long-term growth.",
  },
];

const AmendPrompt: React.FC = () => {
  const [selectedPitch, setSelectedPitch] = useState<{
    label: string;
    description: string;
  } | null>(null);

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedLabel = event.target.value;
    const pitch = prompts.find((p) => p.label === selectedLabel);
    setSelectedPitch(pitch || null);
  };

  return (
    <div className="login-container  flex-col d-flex">
      <h2>Pitch Generator</h2>
      <div className="login-box gap-down">
        <div className="input-section">
          <div className="form-group">
            <label>Select prompt</label>
            <select
              onChange={handleSelectChange}
              value={selectedPitch?.label || ""}
            >
              <option value="">Select a pitch</option>
              {prompts.map((pitch, index) => (
                <option key={index} value={pitch.label}>
                  {pitch.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Input</label>
            <textarea
              placeholder="Generated content will appear here"
              rows={10}
              value={selectedPitch?.description}
            ></textarea>
          </div>

          <div className="form-group">
            <button className="save-button">Amend prompt</button>
          </div>
          <br></br>
          <div className="form-group">
            <label>Email Template</label>
            <input type="text" placeholder="Enter email template" />
          </div>

          <div className="form-group">
            <label>View ID</label>
            <input type="text" placeholder="Enter view ID" />
          </div>
          <div className="button-group">
            <button className="action-button">Generate Pitch</button>
            <button className="stop-button">Stop</button>
          </div>

          <div className="options checkbox-options">
            <ul>
              <li>
                <label>
                  <input type="checkbox" /> Overwrite
                </label>
              </li>
              <li>
                <label>
                  <input type="checkbox" /> Skip Scraping
                </label>
              </li>
              <li>
                <label>
                  <input type="checkbox" /> Show Error Messages
                </label>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="login-box gap-down">
        <h2>Token Information</h2>
        <div className="form-group">
          <label>Input</label>
          <input type="text" placeholder="Input" />
        </div>
        <div className="form-group">
          <label>Output</label>
          <input type="text" placeholder="Output" />
        </div>
        <div className="form-group">
          <label>Usage</label>
          <textarea placeholder="Usage details" rows={2}></textarea>
        </div>
        <div className="form-group">
          <button className="save-button">Save</button>
        </div>
      </div>
      <div className="login-box gap-down">
        <h2>Output</h2>
        <div className="form-group">
          <textarea
            placeholder="Generated content will appear here"
            rows={6}
          ></textarea>
        </div>
        <div className="form-group">
          <label>
            <a href="/" className="reset-link">
              LinkLabel1
            </a>
          </label>
          <textarea
            placeholder="Generated content will appear here"
            rows={6}
          ></textarea>
        </div>
      </div>
    </div>
  );
};

export default AmendPrompt;

/* MainPage.css */
