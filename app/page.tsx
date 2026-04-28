"use client";

import { useEffect, useRef , useState } from "react";

type ChatMessage = {
  role: "user" | "ai";
  text: string;
};

export default function Home() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const recognitionRef = useRef<any>(null);
  
  useEffect(() => {
    const saved = localStorage.getItem("nexus-chat");

    if (saved) {
      setChat(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "nexus-chat",
      JSON.stringify(chat)
    );
  }, [chat]);

  const askAI = async (text: string) => {
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: text })
      });

      const data = await res.json();

      setChat((prev) => [
        ...prev,
        { role: "ai", text: data.reply || "No response." }
      ]);
    } catch {
      setChat((prev) => [
        ...prev,
        { role: "ai", text: "Something went wrong." }
      ]);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || loading) return;

    const userText = message;

    setChat((prev) => [
      ...prev,
      { role: "user", text: userText }
    ]);

    setMessage("");
    setLoading(true);

    await askAI(userText);

    setLoading(false);
  };
   const startVoice = () => {
  const SpeechRecognition =
    window.SpeechRecognition ||
    (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Voice not supported");
    return;
  }

  const recognition = new SpeechRecognition();

  recognition.lang = "en-US";
  recognition.start();

  recognition.onresult = (event: any) => {
    const text = event.results[0][0].transcript;
    setMessage(text);
  };

  recognitionRef.current = recognition;
};

const clearChat = () => {
  setChat([]);
  localStorage.removeItem("nexus-chat");
};
  const clearChat = () => {
    setChat([]);
    localStorage.removeItem("nexus-chat");
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const regenerate = async () => {
    const lastUser = [...chat]
      .reverse()
      .find((item) => item.role === "user");

    if (!lastUser) return;

    setLoading(true);
    await askAI(lastUser.text);
    setLoading(false);
  };

  return (
    <main className="nexus-layout">
      <aside className="sidebar">
        <div className="logo">Nexus</div>

        <button
          className="new-chat-btn"
          onClick={clearChat}
        >
          + New Chat
        </button>

        <div className="sidebar-footer">
          Chat Saved Automatically
        </div>
      </aside>

      <section className="main-chat">
        <header className="topbar">
          <div>
            <h1>Nexus AI</h1>
            <span>Smart Assistant</span>
          </div>

          <button
            className="mini-btn"
            onClick={regenerate}
          >
            Regenerate
          </button>
        </header>

        <div className="messages">
          {chat.length === 0 && (
            <div className="empty-state">
              <h2>Welcome to Nexus</h2>
              <p>Your chats will be saved.</p>
            </div>
          )}

          {chat.map((item, index) => (
            <div key={index}>
              <div className={`bubble ${item.role}`}>
                {item.text}
              </div>

              <button
                className="copy-btn"
                onClick={() => copyText(item.text)}
              >
                Copy
              </button>
            </div>
          ))}

          {loading && (
            <div className="bubble ai">
              Thinking...
            </div>
          )}
        </div>

        <div className="composer">
          <input
            type="text"
            placeholder="Message Nexus..."
            value={message}
            onChange={(e) =>
              setMessage(e.target.value)
            }
            onKeyDown={(e) =>
              e.key === "Enter" && sendMessage()
            }
          />
           <button onClick={startVoice}>
           🎤
           </button>

          <button onClick={sendMessage}>
            Send
          </button>
        </div>
      </section>
    </main>
  );
}