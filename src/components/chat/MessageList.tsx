"use client";

import { Message } from "ai";
import { cn } from "@/lib/utils";
import { User, Bot, Loader2 } from "lucide-react"; // Bot kept for assistant avatar
import { MarkdownRenderer } from "./MarkdownRenderer";

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  return (
    <div className="flex flex-col px-4 py-6">
      <div className="space-y-5 max-w-4xl mx-auto w-full">
        {messages.map((message) => (
          <div
            key={message.id || message.content}
            className={cn(
              "flex gap-3",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {message.role === "assistant" && (
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-8 h-8 rounded-lg bg-primary/15 ring-1 ring-primary/20 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              </div>
            )}

            <div className={cn(
              "flex flex-col gap-1.5 max-w-[85%]",
              message.role === "user" ? "items-end" : "items-start"
            )}>
              <div className={cn(
                "rounded-xl px-4 py-3 text-sm",
                message.role === "user"
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  : "bg-card text-foreground border border-border/60 shadow-sm"
              )}>
                {message.parts ? (
                  <>
                    {message.parts.map((part, partIndex) => {
                      switch (part.type) {
                        case "text":
                          return message.role === "user" ? (
                            <span key={partIndex} className="whitespace-pre-wrap">{part.text}</span>
                          ) : (
                            <MarkdownRenderer
                              key={partIndex}
                              content={part.text}
                              className="prose-sm"
                            />
                          );
                        case "reasoning":
                          return (
                            <div key={partIndex} className="mt-3 p-3 bg-muted/50 rounded-lg border border-border/60">
                              <span className="text-xs font-medium text-muted-foreground block mb-1">Reasoning</span>
                              <span className="text-sm text-foreground/80">{part.reasoning}</span>
                            </div>
                          );
                        case "tool-invocation": {
                          const tool = part.toolInvocation;
                          const input = tool.args as Record<string, string> | undefined;
                          const file = input?.path?.split("/").pop() ?? "";
                          const commandLabels: Record<string, string> = {
                            create: `Creating ${file}`,
                            str_replace: `Updating ${file}`,
                            insert: `Editing ${file}`,
                            view: `Reading ${file}`,
                            rename: `Renaming ${file}`,
                            delete: `Deleting ${file}`,
                          };
                          const label = (input?.command && commandLabels[input.command]) ?? tool.toolName;
                          return (
                            <div key={partIndex} className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-muted/60 rounded-lg text-xs border border-border/60">
                              {tool.state === "result" && tool.result ? (
                                <>
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></div>
                                  <span className="text-muted-foreground">{label}</span>
                                </>
                              ) : (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin text-primary" />
                                  <span className="text-muted-foreground">{label}…</span>
                                </>
                              )}
                            </div>
                          );
                        }
                        case "source":
                          return (
                            <div key={partIndex} className="mt-2 text-xs text-muted-foreground/60">
                              Source: {JSON.stringify(part.source)}
                            </div>
                          );
                        case "step-start":
                          return partIndex > 0 ? <hr key={partIndex} className="my-3 border-border/60" /> : null;
                        default:
                          return null;
                      }
                    })}
                    {isLoading &&
                      message.role === "assistant" &&
                      messages.indexOf(message) === messages.length - 1 && (
                        <div className="flex items-center gap-2 mt-3 text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span className="text-xs">Generating…</span>
                        </div>
                      )}
                  </>
                ) : message.content ? (
                  message.role === "user" ? (
                    <span className="whitespace-pre-wrap">{message.content}</span>
                  ) : (
                    <MarkdownRenderer content={message.content} className="prose-sm" />
                  )
                ) : isLoading &&
                  message.role === "assistant" &&
                  messages.indexOf(message) === messages.length - 1 ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span className="text-xs">Generating…</span>
                  </div>
                ) : null}
              </div>
            </div>

            {message.role === "user" && (
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-8 h-8 rounded-lg bg-primary/20 ring-1 ring-primary/30 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
