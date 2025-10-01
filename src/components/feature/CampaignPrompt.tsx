import React, { useState } from "react";
import axios from "axios";
import API_BASE_URL from "../../config";

interface WebSource {
  url: string;
  title: string;
  snippet: string;
}

interface Message {
  sender: "user" | "assistant";
  text: string;
  sources?: WebSource[]; // ✅ optional sources from web search
}

const CampaignPrompt: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState("");
  const [userId] = useState("626");
  const [selectedModel, setSelectedModel] = useState("gpt-4o-mini");
  
  const [masterPrompt, setMasterPrompt] = useState("");
  const [campaignPrompt, setCampaignPrompt] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  
  // UI State
  const [isMasterPromptExpanded, setIsMasterPromptExpanded] = useState(false);
  const [expandedMessageIndex, setExpandedMessageIndex] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState("");
  const [modalTitle, setModalTitle] = useState("");

  const API_URL = `${API_BASE_URL}/api/CampaignPrompt`;

  const availableModels = [
    { value: "gpt-5-turbo", label: "GPT-5 Turbo " },
    { value: "gpt-5", label: "GPT-5" },
    { value: "gpt-5-mini", label: "GPT-5 Mini" },
    { value: "gpt-4o", label: "GPT-4 Optimized" },
    { value: "gpt-4o-mini", label: "GPT-4  Mini" },
    { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
    { value: "gpt-4", label: "GPT-4" },
    { value: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
    { value: "gpt-4.1", label: "GPT-4.1" },
  ];

  // Open modal with content
  const openModal = (content: string, title: string) => {
    setModalContent(content);
    setModalTitle(title);
    setIsModalOpen(true);
  };

  // ✅ Start Campaign
  const startCampaign = async () => {
    if (!masterPrompt) {
      alert("Please enter a Master Prompt!");
      return;
    }
    try {
      const res = await axios.post(`${API_URL}/start`, {
        userId,
        systemPrompt: masterPrompt,
        model: selectedModel,
      });

      const result = res.data.response;
      const newMessage: Message = { sender: "assistant", text: result.assistantText };

      if (result.toolCalls && result.toolCalls.length > 0) {
        const sources: WebSource[] = result.toolCalls.flatMap((call: any) => call.action?.sources || []);
        if (sources.length > 0) newMessage.sources = sources;
      }

      setMessages([...messages, newMessage]);
    } catch (err: any) {
      alert("❌ Error starting campaign: " + err.message);
    }
  };

  // ✅ Send Chat
  const sendMessage = async () => {
    if (!userInput || userInput.trim() === "") return;
    
    const currentInput = userInput.trim();
    setUserInput(""); // clear input immediately
    
    const newMsgs: Message[] = [...messages, { sender: "user", text: currentInput }];
    setMessages(newMsgs);

    try {
      const res = await axios.post(`${API_URL}/chat`, {
        userId,
        message: currentInput,
        model: selectedModel,
      });

      const result = res.data.response;
      const newMessage: Message = { sender: "assistant", text: result.assistantText };

      if (result.toolCalls && result.toolCalls.length > 0) {
        const sources: WebSource[] = result.toolCalls.flatMap((call: any) => call.action?.sources || []);
        if (sources.length > 0) newMessage.sources = sources;
      }

      setMessages([...newMsgs, newMessage]);

      if (result.assistantText.includes("Campaign Master Prompt"))
        setCampaignPrompt(result.assistantText);

    } catch (err: any) {
      alert("❌ Error chatting: " + err.message);
    }
  };

  // ✅ Refine Prompt
  const refinePrompt = async () => {
    if (!feedback) {
      alert("⚠ Please enter feedback text!");
      return;
    }
    try {
      const res = await axios.post(`${API_URL}/refine`, { userId, feedback });
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

  // ✅ Helper
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">📌 Campaign Master Prompt Assistant</h2>

      {/* Model Selection */}
      <div className="bg-white shadow-md rounded-md p-4 mb-6">
        <label className="block font-semibold mb-2 text-gray-700">Select AI Model:</label>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="w-full border rounded-md p-2 text-gray-700 mb-3 focus:ring-2 focus:ring-indigo-500"
        >
          <optgroup label="GPT-5 Models">
            <option value="gpt-5-turbo">GPT-5 Turbo </option>
            <option value="gpt-5">GPT-5</option>
            <option value="gpt-5-mini">GPT-5 Mini</option>
          </optgroup>
          <optgroup label="GPT-4 Models">
            <option value="gpt-4o">GPT-4 Optimized</option>
            <option value="gpt-4o-mini">GPT-4 Mini</option>
            <option value="gpt-4-turbo">GPT-4 Turbo</option>
            <option value="gpt-4">GPT-4</option>
            <option value="gpt-4.1-mini">GPT-4.1 Mini</option>
            <option value="gpt-4.1">GPT-4.1</option>
          </optgroup>
        </select>
        <p className="text-xs text-gray-500 mt-1">💡 GPT-5 models offer enhanced reasoning and creativity</p>
      </div>

      {/* Master Prompt */}
      <div className="bg-white shadow-md rounded-md p-4 mb-6">
        <div className="flex justify-between items-center mb-2">
          <label className="block font-semibold text-gray-700">Master prompt:</label>
          <button onClick={() => setIsMasterPromptExpanded(!isMasterPromptExpanded)} className="text-sm text-indigo-600 hover:text-indigo-800">
            {isMasterPromptExpanded ? "📥 Collapse" : "📤 Expand"}
          </button>
        </div>
        <textarea
          rows={isMasterPromptExpanded ? 10 : 3}
          className="w-full border rounded-md p-2 text-gray-700 mb-3 transition-all duration-300"
          value={masterPrompt}
          onChange={(e) => setMasterPrompt(e.target.value)}
          placeholder="Enter your master prompt instruction for GPT..."
        />
        <div className="flex gap-2">
          <button onClick={startCampaign} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">🚀 Start campaign</button>
          {masterPrompt && (
            <button onClick={() => openModal(masterPrompt, "Master Prompt")} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">🔍 View Full</button>
          )}
        </div>
      </div>

      {/* Chat UI */}
      <div className="bg-white shadow-md rounded-md p-4 mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-gray-700">💬 Conversation</h3>
          <button
            onClick={() => {
              const fullConversation = messages.map(msg => `${msg.sender.toUpperCase()}:\n${msg.text}`).join("\n\n---\n\n");
              openModal(fullConversation, "Full Conversation");
            }}
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            📋 View Full Conversation
          </button>
        </div>
        <div className="border rounded-md p-3 min-h-[150px] max-h-[600px] overflow-y-auto bg-gray-50">
          {messages.map((msg, i) => (
            <div key={i} className={`mb-3 ${msg.sender === "user" ? "text-right" : "text-left"}`}>
              <div className="inline-block max-w-[80%]">
                <div
  className={`px-3 py-2 inline-block rounded-md ${
    msg.sender === "user" ? "bg-indigo-100 text-indigo-800" : "bg-gray-200 text-gray-800"
  }`}
>
  <b>{msg.sender}:</b>{" "}
  {msg.text.includes("<") && msg.text.includes(">")
    ? <div dangerouslySetInnerHTML={{ __html: msg.text }} />
    : <pre className="whitespace-pre-wrap">{msg.text}</pre>
  }
</div>

                {/* ✅ Show sources below assistant message */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2 text-sm bg-yellow-50 p-2 rounded-md border border-yellow-200">
                    <b>🔎 Sources:</b>
                    <ul className="list-disc pl-5 mt-1">
                      {msg.sources.map((src, idx) => (
                        <li key={idx} className="mt-1">
                          <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                            {src.title || src.url}
                          </a>
                          <div className="text-gray-600 text-xs">{src.snippet}</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Show More/Less Toggle */}
                {msg.text.length > 200 && (
                  <div className="mt-1">
                    <button
                      onClick={() => setExpandedMessageIndex(expandedMessageIndex === i ? null : i)}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      {expandedMessageIndex === i ? "Show less" : "Show more"}
                    </button>
                    <button
                      onClick={() => openModal(msg.text, `${msg.sender === "user" ? "User" : "Assistant"} Message`)}
                      className="text-xs text-gray-600 hover:text-gray-800 ml-2"
                    >
                      🔍 Full view
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
                <div className="flex mt-3">
          <input
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Type your response..."
            className="flex-grow border rounded-l-md p-2"
            onKeyPress={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault(); // Prevent default Enter (newline)
                sendMessage();
              }
            }}
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
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-bold text-gray-800">
              🎯 Current Campaign Master Prompt
            </h3>
            <button
              onClick={() => openModal(campaignPrompt, "Campaign Master Prompt")}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              🔍 View Full
            </button>
          </div>
          <pre className="bg-gray-100 p-3 rounded-md text-sm overflow-x-auto max-h-[300px]">
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

      {/* Display current model */}
      <div className="text-sm text-gray-600 mt-4 flex items-center">
        Currently using:{" "}
        <span
          className={`ml-2 px-3 py-1 rounded-full text-xs font-semibold ${
            selectedModel.includes("gpt-5")
              ? "bg-purple-100 text-purple-800"
              : selectedModel.includes("gpt-4")
              ? "bg-blue-100 text-blue-800"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {selectedModel}
        </span>
      </div>

      {/* Modal for full text view */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div
            className="bg-white rounded-lg w-full flex flex-col"
            style={{
              maxWidth: "1200px",
              width: "90vw",
              height: "auto",
              maxHeight: "90vh",
              margin: "auto",
              display: "flex",
              flexDirection: "column",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <div
              className="flex justify-between items-center border-b"
              style={{ padding: "16px 24px", minHeight: "60px" }}
            >
              <h3 className="text-lg font-semibold text-gray-800">
                {modalTitle}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
                style={{
                  fontSize: "24px",
                  lineHeight: "1",
                  padding: "8px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div
              style={{
                padding: "24px",
                overflowY: "auto",
                flex: "1 1 auto",
                minHeight: "200px",
                maxHeight: "calc(90vh - 140px)",
              }}
            >
              {modalContent.includes("<") && modalContent.includes(">")
                ? (
                  <div
                    style={{
                      fontSize: "16px",
                      lineHeight: "1.6",
                      color: "#374151",
                      wordWrap: "break-word",
                    }}
                    dangerouslySetInnerHTML={{ __html: modalContent }}
                  />
                )
                : (
                  <pre
                    style={{
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      fontSize: "16px",
                      lineHeight: "1.6",
                      color: "#374151",
                      fontFamily:
                        'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                      margin: 0,
                      padding: 0,
                      background: "none",
                      border: "none",
                    }}
                  >
                    {modalContent}
                  </pre>
                )}
            </div>

            {/* Modal Footer */}
            <div
              className="border-t flex justify-end gap-2"
              style={{ padding: "16px 24px", minHeight: "70px" }}
            >
              <button
                onClick={() => {
                  const textContent =
                    modalContent.includes("<") && modalContent.includes(">")
                      ? modalContent.replace(/<[^>]*>/g, "")
                      : modalContent;
                  navigator.clipboard.writeText(textContent);
                  alert("✅ Copied to clipboard!");
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                📋 Copy
              </button>
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignPrompt;