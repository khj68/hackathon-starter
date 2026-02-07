"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ArrowUp, Loader2 } from "lucide-react";
import { useCallback, useRef, useState } from "react";

interface PromptFormProps {
  onSubmit: (message: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function PromptForm({
  onSubmit,
  isLoading = false,
  disabled = false,
  placeholder = "Ask Claude to build something...",
}: PromptFormProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!message.trim() || isLoading || disabled) return;
      onSubmit(message.trim());
      setMessage("");
    },
    [message, onSubmit, isLoading, disabled]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
      }
    },
    [handleSubmit]
  );

  return (
    <form onSubmit={handleSubmit} className="relative flex w-full flex-col">
      <div
        className={cn(
          "relative z-0 rounded-[calc(var(--radius)+8px)] p-px shadow-xl transition-all",
          "focus-within:ring-fuchsia-300/15 focus-within:border-fuchsia-300/40 focus-within:ring-4",
          "user-message-border",
          (isLoading || disabled) && "opacity-50"
        )}
      >
        <div className="bg-background absolute inset-px -z-10 rounded-[calc(var(--radius)+1px)]" />

        <div className="relative flex min-h-24 flex-col rounded-[calc(var(--radius)+6px)] bg-gradient-to-br from-white via-pink-50/45 to-blue-50/50">
          <div className="absolute inset-0 -z-20 rounded-[calc(var(--radius)+6px)] bg-[radial-gradient(circle_at_15%_15%,rgba(244,114,182,0.16),transparent_44%),radial-gradient(circle_at_92%_80%,rgba(59,130,246,0.12),transparent_46%)]" />
          <Textarea
            ref={textareaRef}
            autoFocus
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading || disabled}
            placeholder={placeholder}
            className="placeholder:text-violet-400/75 bg-transparent! max-h-48 flex-1 resize-none border-0 text-violet-900 shadow-none focus-visible:ring-0"
          />

          <div className="flex items-center justify-end gap-2 p-2">
            <Button
              type="submit"
              size="iconSm"
              disabled={!message.trim() || isLoading || disabled}
              className="rounded-full border border-violet-200 bg-gradient-to-br from-violet-100 to-pink-100 text-violet-700 hover:translate-y-[-1px] hover:from-violet-200 hover:to-pink-200"
            >
              {isLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowUp className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
