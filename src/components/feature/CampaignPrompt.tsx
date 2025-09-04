import React, { useState } from "react";
import axios from "axios";
import API_BASE_URL from "../../config";

interface Message {
  sender: "user" | "assistant";
  text: string;
}

const CampaignPrompt: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState("");
  const [userId, setUserId] = useState("626");

  const [masterPrompt, setMasterPrompt] = useState("");
  const [campaignPrompt, setCampaignPrompt] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");

  const API_URL = `${API_BASE_URL}/api/CampaignPrompt`;

  // ✅ Start Campaign
// Start Campaign
const startCampaign = async () => {
  if (!masterPrompt) {
    alert("Please enter a Master Prompt!");
    return;
  }
  try {
    const res = await axios.post(`${API_URL}/start`, {
      userId,
      systemPrompt: masterPrompt,
    });

    // Grab first AI question instead of static success
    const reply = res.data.response;
    setMessages([
      ...messages,
      { sender: "assistant", text: reply }
    ]);
  } catch (err: any) {
    alert("Error starting campaign: " + err.message);
  }
};

  // ✅ Send Chat
  const sendMessage = async () => {
    if (!userInput) return;
    const newMsgs: Message[] = [
      ...messages,
      { sender: "user", text: userInput },
    ];
    setMessages(newMsgs);

    try {
      const res = await axios.post(`${API_URL}/chat`, {
        userId,
        message: userInput,
      });
      const reply = res.data.response;
      setMessages([...newMsgs, { sender: "assistant", text: reply }]);

      if (reply.includes("Campaign Master Prompt")) setCampaignPrompt(reply);
    } catch (err: any) {
      alert("❌ Error chatting: " + err.message);
    }
    setUserInput("");
  };

  // ✅ Refine Prompt
  const refinePrompt = async () => {
    if (!feedback) {
      alert("⚠ Please enter feedback text!");
      return;
    }
    try {
      const res = await axios.post(`${API_URL}/refine`, {
        userId,
        feedback,
      });
      setCampaignPrompt(res.data.refinedPrompt);
      setMessages([
        ...messages,
        { sender: "assistant", text: "🔄 Refined Campaign Master Prompt:" },
        { sender: "assistant", text: res.data.refinedPrompt },
      ]);
    } catch (err: any) {
      alert("❌ Error refining prompt: " + err.message);
    }
  };

  // ✅ Approve Final
  const approvePrompt = async () => {
    try {
      const res = await axios.post(`${API_URL}/approve`, { userId });
      alert("✅ Final Approved Prompt:\n" + res.data.finalPrompt);
    } catch (err: any) {
      alert("❌ Error approving: " + err.message);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">
        📌 Campaign Master Prompt Assistant
      </h2>

      {/* Master Prompt Setup */}
      <div className="bg-white shadow-md rounded-md p-4 mb-6">
        <label className="block font-semibold mb-2 text-gray-700">
          Master Prompt:
        </label>
        <textarea
          rows={3}
          className="w-full border rounded-md p-2 text-gray-700 mb-3"
          value={masterPrompt}
          onChange={(e) => setMasterPrompt(e.target.value)}
          placeholder="Enter your master prompt instruction for GPT..."
        />
        <button
          onClick={startCampaign}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          🚀 Start Campaign
        </button>
      </div>

      {/* Chat UI */}
      <div className="bg-white shadow-md rounded-md p-4 mb-6">
        <h3 className="font-semibold text-gray-700 mb-3">💬 Conversation</h3>
        <div className="border rounded-md p-3 min-h-[150px] max-h-[600px] overflow-y-auto bg-gray-50">
              {messages.map((msg, i) => (
            <div
              key={i}
              className={`mb-2 ${
                msg.sender === "user" ? "text-right" : "text-left"
              }`}
            >
              <span
                className={`px-3 py-2 inline-block rounded-md ${
                  msg.sender === "user"
                    ? "bg-indigo-100 text-indigo-800"
                    : "bg-gray-200 text-gray-800"
                }`}
              >
                <b>{msg.sender}:</b> {msg.text}
              </span>
            </div>
          ))}
        </div>
        <div className="flex mt-3">
          <input
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Type your response..."
            className="flex-grow border rounded-l-md p-2"
          />
          <button
            onClick={sendMessage}
            className="px-4 bg-indigo-600 text-white rounded-r-md hover:bg-indigo-700"
          >
            Send
          </button>
        </div>
      </div>

      {/* Current Campaign Prompt */}
      {campaignPrompt && (
        <div className="bg-white shadow-md rounded-md p-4 mb-6">
          <h3 className="text-lg font-bold text-gray-800 mb-2">
            🎯 Current Campaign Master Prompt
          </h3>
          <pre className="bg-gray-100 p-3 rounded-md text-sm overflow-x-auto">
            {campaignPrompt}
          </pre>

          {/* Feedback Section */}
          <textarea
            rows={3}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="w-full border rounded-md p-2 mt-3"
            placeholder="Enter feedback to improve this campaign prompt..."
          />
          <div className="mt-3">
            <button
              onClick={refinePrompt}
              className="mr-3 px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
            >
              🔄 Refine Prompt
            </button>
            <button
              onClick={approvePrompt}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              ✅ Approve Final
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignPrompt;