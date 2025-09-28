"use client";
import Image from "next/image";
import { useState } from "react";

type message = {
  text: string;
  sender: "user" | "bot";
};

export default function Chat() {
  const [input, setInput] = useState("");
  const [chat, setChat] = useState<message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const send = async () => {
    if (input.trim() === "" || isLoading) return;

    const userMessage = input;


    setChat((prev) => [...prev, { text: userMessage, sender: "user" }]);
    setInput("");
    setIsLoading(true);

    try {

      const response = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userMessage }),
      });

      const data = await response.json();
      const botText = data.answer || "Sorry, no response.";

      // Add bot reply
      setChat((prev) => [...prev, { text: botText, sender: "bot" }]);
    } catch (error) {
      setChat((prev) => [
        ...prev,
        { text: "Something went wrong!", sender: "bot" },
      ]);
    }

    setIsLoading(false);
  };

  return (
    <>
      <div className="flex h-full w-full flex-col justify-center items-center mx-5 gap-y-5 py-4">
        {/* Chat messages area */}
        <div
          id="chatBox"
          className="flex flex-col px-2 overflow-y-auto h-full w-full rounded-xl scrollbar-hide"
        >
          {chat.map((message, index) => (
            <div
              key={index}
              className={`bg-gray-100 w-fit max-w-[60%] h-fit p-1 px-2 rounded-md mb-4  ${
                message.sender === "user"
                  ? "rounded-br-none self-end"
                  : "rounded-bl-none self-start"
              }`}
            >
              {message.text}
            </div>
          ))}
        </div>

        <div className="w-[53%] h-24 bg-[#f2f2f7] px-4 py-2 rounded-xl flex flex-col">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !isLoading) {
                e.preventDefault();
                send();
              }
            }}
            disabled={isLoading}
            className="outline-none resize-none w-[95%] h-14 mt-1 placeholder-text-gray-500 text-black scrollbar-hide disabled:opacity-50"
            placeholder={isLoading ? "AI is thinking..." : "Enter your text here..."}
          ></textarea>

          <div
            onClick={isLoading ? undefined : send}
            className={`ml-auto -mr-1 mb-0.5 hover:scale-105 cursor-pointer ${
              isLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <Image src="/send button.png" alt="button" height={32} width={32} />
          </div>
        </div>
      </div>
    </>
  );
}
