"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { CCMessages } from "@/components/chat/cc-messages";
import { PromptForm } from "@/components/chat/prompt-form";
import {
  isAssistantMessage,
  isPlannerAgentResponse,
  isTextBlock,
} from "@/lib/types";
import type { SessionEntry, ConversationResponse, PlannerAgentResponse } from "@/lib/types";
import { Compass, MapPinned, Plane, Sparkles } from "lucide-react";

interface PendingMessage {
  id: string;
  content: string;
  timestamp: string;
}

const LOADING_PHRASES = [
  "여행 가방에 설렘 담는 중",
  "동선을 말랑하게 다듬는 중",
  "항공이랑 숙소 궁합 맞춰보는 중",
  "취향에 맞는 코스를 고르는 중",
  "곧 딱 맞는 여행 플랜을 보여줄게",
];

function getCountryBackground(country: string, city?: string): string | null {
  const normalized = country.trim().toLowerCase();
  const seedMap: Record<string, string> = {
    japan: "japan+travel+landscape",
    thailand: "thailand+beach+travel",
    "south korea": "korea+coast+landscape",
    france: "france+nature+travel",
    "united kingdom": "uk+landscape+travel",
    "united states": "usa+national+park",
    singapore: "singapore+skyline+travel",
  };

  const query = seedMap[normalized] || `${country}+travel+landscape`;
  const cityQuery = city ? `${city}+${query}` : query;
  return `https://source.unsplash.com/1600x900/?${encodeURIComponent(cityQuery)}`;
}

export default function Home() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [status, setStatus] = useState<ConversationResponse["status"]>("idle");
  const [serverMessages, setServerMessages] = useState<SessionEntry[]>([]);
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);
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

  useEffect(() => {
    if (status !== "running") return;
    const timer = setInterval(() => {
      setLoadingTextIndex((prev) => (prev + 1) % LOADING_PHRASES.length);
    }, 1600);

    return () => clearInterval(timer);
  }, [status]);

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

  const latestPlannerResponse = useMemo<PlannerAgentResponse | null>(() => {
    for (let i = serverMessages.length - 1; i >= 0; i -= 1) {
      const message = serverMessages[i];
      if (!message || !isAssistantMessage(message)) continue;
      const blocks = message.message.content;
      const text = blocks
        .filter(isTextBlock)
        .map((block) => block.text)
        .join("\n")
        .trim();
      if (!text) continue;
      try {
        const parsed = JSON.parse(text);
        if (isPlannerAgentResponse(parsed)) return parsed;
      } catch {
        continue;
      }
    }
    return null;
  }, [serverMessages]);

  const destinationCountry = latestPlannerResponse?.state.trip?.region?.country?.trim() || "";
  const destinationCity = latestPlannerResponse?.state.trip?.region?.city?.trim() || "";
  const destinationBackground = destinationCountry
    ? getCountryBackground(destinationCountry, destinationCity)
    : null;
  return (
    <div
      className="travel-page-load flex h-screen flex-col"
      style={
        destinationBackground
          ? {
              backgroundImage: `linear-gradient(180deg, rgba(2, 6, 23, 0.52), rgba(15, 23, 42, 0.6)), url(${destinationBackground})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
    >
      <header className="mx-3 mt-3 rounded-2xl travel-glass px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-fuchsia-200 bg-gradient-to-br from-pink-50 to-blue-50 p-2 text-fuchsia-600 cute-bounce">
              <Compass className="size-4" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-fuchsia-600/80">Dreamy Planner</p>
              <h1 className="text-xl font-semibold text-violet-900 [font-family:var(--font-travel-display)]">Travel Agent</h1>
            </div>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <span className="travel-chip"><Plane className="mr-1 inline size-3" /> Flight</span>
            <span className="travel-chip"><MapPinned className="mr-1 inline size-3" /> Route</span>
            <span className="travel-chip"><Sparkles className="mr-1 inline size-3" /> Cute Plan</span>
          </div>
        </div>
      </header>

      <div className="flex-1 p-3 pt-2">
        <div className="travel-glass cute-pop flex h-full flex-col rounded-[1.6rem] shadow-[0_24px_70px_-36px_rgba(168,85,247,0.46)]">
          <div className="flex-1 overflow-auto">
            {!hasMessages ? (
              <div className="flex h-full flex-col items-center justify-center px-4 text-center">
                <p className="text-[11px] uppercase tracking-[0.18em] text-violet-600/75">Plan Your Next Escape</p>
                <h2 className="mt-2 text-3xl font-semibold text-violet-900 [font-family:var(--font-travel-display)]">
                  어떤 여행을 가보고 싶어?
                </h2>
                <p className="mt-3 max-w-xl text-sm text-violet-800/75">
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
            <div className="mx-4 mb-3 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          {status === "running" && hasMessages && (
            <div className="mx-4 mb-2 flex items-center gap-2">
              <span className="loading-pill">
                <span className="cute-bounce">{LOADING_PHRASES[loadingTextIndex]}</span>
                <span className="ml-1 loading-dots" aria-hidden="true">
                  <span>.</span>
                  <span>.</span>
                  <span>.</span>
                </span>
              </span>
            </div>
          )}

          {hasMessages && (
            <div className="border-t border-slate-200 p-4">
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
