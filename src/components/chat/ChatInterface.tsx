"use client";

import { useEffect, useRef } from "react";
import { Bot } from "lucide-react";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChat } from "@/lib/contexts/chat-context";

export function ChatInterface() {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { messages, input, handleInputChange, handleSubmit, status } = useChat();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center select-none relative overflow-hidden">
          {/* Ambient spotlight */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[320px] h-[320px] rounded-full" style={{background: 'radial-gradient(circle, oklch(0.63 0.22 280 / 6%) 0%, transparent 65%)'}} />
          </div>
          <div className="flex items-center justify-center w-11 h-11 rounded-[14px] mb-4 ring-1 ring-primary/25 glow-primary relative z-10" style={{background: 'linear-gradient(145deg, oklch(0.22 0.08 280), oklch(0.17 0.04 280))'}}>
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <p className="text-foreground font-semibold text-[14px] mb-1.5 leading-snug relative z-10">
            Start a conversation to<br />generate React components
          </p>
          <p className="text-muted-foreground text-[13px] leading-relaxed max-w-[190px] relative z-10">
            Buttons, forms, cards, dashboards — just describe it
          </p>
        </div>
      ) : (
        <ScrollArea ref={scrollAreaRef} className="flex-1 min-h-0">
          <div className="pr-2">
            <MessageList messages={messages} isLoading={status === "streaming"} />
          </div>
        </ScrollArea>
      )}

      <div className="flex-shrink-0">
        <MessageInput
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          isLoading={status === "submitted" || status === "streaming"}
        />
      </div>
    </div>
  );
}
