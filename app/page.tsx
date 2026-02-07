"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { CCMessages } from "@/components/chat/cc-messages";
import { PromptForm } from "@/components/chat/prompt-form";
import type { SessionEntry, ConversationResponse } from "@/lib/types";
import { Compass, MapPinned, Plane, Sparkles } from "lucide-react";

interface PendingMessage {
  id: string;
  content: string;
  timestamp: string;
}

export default function Home() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [status, setStatus] = useState<ConversationResponse["status"]>("idle");
  const [serverMessages, setServerMessages] = useState<SessionEntry[]>([]);
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const postCompletionPollsRef = useRef(0);

  const getUserMessageText = useCallback((content: string | unknown[]): string => {
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
      return content
        .filter((b: any) => b.type === "text" && b.text)
        .map((b: any) => b.text)
        .join("\n");
    }
    return "";
  }, []);

  const hasPendingMatch = useCallback(
    (pending: PendingMessage, serverMsgs: SessionEntry[]) => {
      return serverMsgs.some(
        (m) =>
          m.type === "user" &&
          getUserMessageText(m.message.content) === pending.content
      );
    },
    [getUserMessageText]
  );

  useEffect(() => {
    if (!conversationId) return;

    const isDone = status === "completed" || status === "error";
    if (isDone && (pendingMessages.length === 0 || postCompletionPollsRef.current >= 10)) return;
    if (!isDone && status !== "running") return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/conversations/${conversationId}`);
        if (response.ok) {
          const data: ConversationResponse = await response.json();
          setServerMessages(data.messages);

          if (data.messages.length > 0) {
            setPendingMessages((prev) =>
              prev.filter((pending) => !hasPendingMatch(pending, data.messages))
            );
          }

          if (data.status === "completed" || data.status === "error") {
            postCompletionPollsRef.current += 1;
          }

          setStatus(data.status);
          setErrorMessage(data.errorMessage || null);
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [conversationId, status, pendingMessages.length, hasPendingMatch]);

  const messages: SessionEntry[] = [
    ...serverMessages,
    ...pendingMessages.map((pending): SessionEntry => ({
      type: "user",
      uuid: pending.id,
      parentUuid: serverMessages.length > 0 ? serverMessages[serverMessages.length - 1].uuid : null,
      sessionId: "",
      timestamp: pending.timestamp,
      isSidechain: false,
      message: {
        role: "user",
        content: pending.content,
      },
    })),
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [serverMessages, pendingMessages]);

  const handleSubmit = useCallback(
    async (content: string) => {
      setIsSubmitting(true);
      setErrorMessage(null);
      postCompletionPollsRef.current = 0;

      const pendingId = `pending-${Date.now()}`;
      const pending: PendingMessage = {
        id: pendingId,
        content,
        timestamp: new Date().toISOString(),
      };
      setPendingMessages((prev) => [...prev, pending]);

      try {
        const response = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId,
            content,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to send message");
        }

        const data = await response.json();
        setConversationId(data.conversationId);
        setStatus("running");
      } catch (error) {
        setPendingMessages((prev) => prev.filter((item) => item.id !== pendingId));
        setErrorMessage(error instanceof Error ? error.message : "Unknown error");
      } finally {
        setIsSubmitting(false);
      }
    },
    [conversationId]
  );

  const isLoading = status === "running" || isSubmitting;
  const hasMessages = messages.length > 0;

  return (
    <div className="travel-page-load flex h-screen flex-col">
      <header className="mx-3 mt-3 rounded-2xl travel-glass px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-cyan-300/40 bg-cyan-400/10 p-2 text-cyan-100">
              <Compass className="size-4" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-100/70">Travel Assistant</p>
              <h1 className="text-lg font-semibold text-slate-50 [font-family:var(--font-travel-display)]">Travel Agent</h1>
            </div>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <span className="travel-chip"><Plane className="mr-1 inline size-3" /> Flight</span>
            <span className="travel-chip"><MapPinned className="mr-1 inline size-3" /> Route</span>
            <span className="travel-chip"><Sparkles className="mr-1 inline size-3" /> Smart Plan</span>
          </div>
        </div>
      </header>

      <div className="flex-1 p-3 pt-2">
        <div className="travel-glass flex h-full flex-col rounded-2xl">
          <div className="flex-1 overflow-auto">
            {!hasMessages ? (
              <div className="flex h-full flex-col items-center justify-center px-4 text-center">
                <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-100/65">Plan Your Next Escape</p>
                <h2 className="mt-2 text-3xl font-semibold text-slate-50 [font-family:var(--font-travel-display)]">
                  어떤 여행을 가보고 싶어?
                </h2>
                <p className="mt-3 max-w-xl text-sm text-slate-300/90">
                  예산, 일정, 분위기만 말해주면 항공·숙소·동선을 한 번에 정리해드릴게요.
                </p>
                <div className="mt-8 w-full max-w-2xl">
                  <PromptForm
                    onSubmit={handleSubmit}
                    isLoading={isLoading}
                    disabled={status === "running"}
                    placeholder="예: 다음 주 3박4일, 가성비 좋고 휴식 중심으로 추천해줘"
                  />
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-4xl px-4 py-6">
                <CCMessages entries={messages} onSubmitSelections={handleSubmit} />
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="mx-4 mb-3 rounded-xl border border-red-400/35 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {errorMessage}
            </div>
          )}

          {status === "running" && hasMessages && (
            <div className="mx-4 mb-2 text-sm text-cyan-100/80">
              <span className="shimmer">Travel Agent가 최적 경로를 계산 중...</span>
            </div>
          )}

          {hasMessages && (
            <div className="border-t border-slate-500/30 p-4">
              <div className="mx-auto max-w-4xl">
                <PromptForm
                  onSubmit={handleSubmit}
                  isLoading={isLoading}
                  disabled={status === "running"}
                  placeholder="추가 조건을 입력해줘 (예: 직항만, 밤 비행 제외, 도보 적게)"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
