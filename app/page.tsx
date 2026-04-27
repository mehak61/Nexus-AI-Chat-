"use client";

import { useState } from "react";

export default function Home() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<
    { role: "user" | "ai"; text: string }[]
  >([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!message.trim()) return;

    const userMessage = message;

    setChat((prev) => [...prev, { role: "user", text: userMessage }]);
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: userMessage
        })
      });

      const data = await res.json();

      setChat((prev) => [
        ...prev,
        { role: "ai", text: data.reply || "No response" }
      ]);
    } catch (error) {
      setChat((prev) => [
        ...prev,
        { role: "ai", text: "Error getting response." }
      ]);
    }

    setLoading(false);
  };

  return (
    <main className="app">
      <div className="topbar">
        <h1>Nexus</h1>
        <span>AI Assistant</span>
      </div>

      <div className="chatbox">
        {chat.length === 0 && (
          <div className="welcome">
            <h2>Welcome to Nexus</h2>
            <p>Ask anything and start chatting.</p>
          </div>
        )}

        {chat.map((msg, i) => (
          <div
            key={i}
            className={`msg ${msg.role === "user" ? "user" : "ai"}`}
          >
            {msg.text}
          </div>
        ))}

        {loading && <div className="msg ai">Thinking...</div>}
      </div>

      <div className="inputbar">
        <input
          type="text"
          placeholder="Ask Nexus anything..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) =>
            e.key === "Enter" && sendMessage()
          }
        />

        <button onClick={sendMessage}>
          Send
        </button>
      </div>
    </main>
  );
}