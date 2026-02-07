"use client";

import { useMemo, useState } from "react";
import type { PlannerAgentResponse } from "@/lib/types";

interface CCAgentResponseProps {
  response: PlannerAgentResponse;
  onSubmitSelections?: (message: string) => void;
}

const STAGE_LABELS: Record<string, string> = {
  collect_intent: "취향 파악",
  collect_region: "목적지 정리",
  collect_dates: "일정 정리",
  collect_weights: "조건 정리",
  search: "옵션 탐색",
  recommend: "추천 결과",
};

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
}

export function CCAgentResponse({ response, onSubmitSelections }: CCAgentResponseProps) {
  const [selectedByQuestion, setSelectedByQuestion] = useState<Record<string, Set<string>>>({});
  const [freeText, setFreeText] = useState("");

  const canSubmitSelections = useMemo(() => {
    const selectedCount = Object.values(selectedByQuestion).reduce(
      (sum, values) => sum + values.size,
      0
    );
    return selectedCount > 0 || freeText.trim().length > 0;
  }, [selectedByQuestion, freeText]);

  const toggleOption = (questionId: string, optionLabel: string): void => {
    setSelectedByQuestion((prev) => {
      const next = { ...prev };
      const existing = new Set(next[questionId] || []);
      if (existing.has(optionLabel)) {
        existing.delete(optionLabel);
      } else {
        existing.add(optionLabel);
      }
      next[questionId] = existing;
      return next;
    });
  };

  return (
    <div className="travel-agent-shell space-y-4 rounded-[1.4rem] border border-violet-200 bg-white p-4 text-slate-900 shadow-[0_20px_38px_-24px_rgba(192,132,252,0.56)]">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-violet-200 bg-gradient-to-r from-pink-50 via-violet-50 to-blue-50 px-3 py-2">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-violet-600/85">Travel Agent</p>
          <p className="text-sm font-semibold text-violet-900">{STAGE_LABELS[response.stage] ?? response.stage}</p>
        </div>
      </div>

      {response.questions.length > 0 && (
        <section className="travel-agent-panel">
          <p className="travel-agent-section-title">추가 확인 질문</p>
          <div className="mt-3 space-y-3">
            {response.questions.map((question, index) => (
              <div
                key={question.id}
                className="travel-agent-reveal rounded-2xl border border-violet-100 bg-white p-3"
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <p className="text-sm font-medium text-violet-900">{question.text}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {question.options.map((option) => (
                    <button
                      type="button"
                      key={`${question.id}-${option.value}`}
                      onClick={() => toggleOption(question.id, option.label)}
                      className={[
                        "max-w-[280px] rounded-2xl border px-2.5 py-1.5 text-left text-xs transition",
                        selectedByQuestion[question.id]?.has(option.label)
                          ? "border-violet-500 bg-violet-500 text-white"
                          : "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100",
                      ].join(" ")}
                    >
                      <div className="font-medium">{option.label}</div>
                      {option.reason && (
                        <div
                          className={
                            selectedByQuestion[question.id]?.has(option.label)
                              ? "mt-0.5 text-[11px] text-white/85"
                              : "mt-0.5 text-[11px] text-violet-500/85"
                          }
                        >
                          {option.reason}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-2">
            <textarea
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder="추가로 직접 입력할 조건이 있으면 적어줘"
              className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm text-violet-900 outline-none ring-violet-200 transition focus:ring"
              rows={2}
            />
            <button
              type="button"
              disabled={!canSubmitSelections}
              onClick={() => {
                const lines: string[] = [];
                for (const question of response.questions) {
                  const selected = [...(selectedByQuestion[question.id] || [])];
                  if (selected.length > 0) {
                    lines.push(`${question.text}: ${selected.join(", ")}`);
                  }
                }
                if (freeText.trim()) {
                  lines.push(`추가 입력: ${freeText.trim()}`);
                }
                const message = lines.join("\n");
                if (!message) return;
                setSelectedByQuestion({});
                setFreeText("");
                if (typeof onSubmitSelections === "function") {
                  onSubmitSelections(message);
                }
              }}
              className="rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 py-2 text-sm font-medium text-white transition hover:translate-y-[-1px] hover:from-violet-600 hover:to-fuchsia-600 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300"
            >
              선택 완료하고 진행
            </button>
          </div>
        </section>
      )}

      {response.results.flights.length > 0 && (
        <section className="travel-agent-panel">
          <p className="travel-agent-section-title">항공 추천</p>
          <ul className="mt-3 space-y-2">
            {response.results.flights.map((flight, index) => (
              <li
                key={flight.id}
                className="travel-agent-reveal rounded-2xl border border-violet-100 bg-white p-3"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <a
                  href={flight.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block transition hover:-translate-y-0.5 hover:text-violet-700"
                >
                  <p className="text-sm font-semibold text-violet-900">{flight.summary}</p>
                  <p className="mt-1 text-xs text-violet-700/75">
                    {formatMoney(flight.price.amount, flight.price.currency)} · {flight.provider}
                  </p>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {response.results.stays.length > 0 && (
        <section className="travel-agent-panel">
          <p className="travel-agent-section-title">숙소 추천</p>
          <ul className="mt-3 space-y-2">
            {response.results.stays.map((stay, index) => (
              <li
                key={stay.id}
                className="travel-agent-reveal rounded-2xl border border-violet-100 bg-white p-3"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <a
                  href={stay.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block transition hover:-translate-y-0.5 hover:text-violet-700"
                >
                  <p className="text-sm font-semibold text-violet-900">{stay.name}</p>
                  <p className="mt-1 text-xs text-violet-700/75">
                    {stay.location.area} · 평점 {stay.rating} · {formatMoney(stay.pricePerNight.amount, stay.pricePerNight.currency)}
                  </p>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {response.results.routeDraft.length > 0 && (
        <section className="travel-agent-panel">
          <p className="travel-agent-section-title">여행 경로 추천</p>
          <div className="mt-3 space-y-3">
            {response.results.routeDraft.map((day) => (
              <div key={`route-day-${day.day}`} className="rounded-2xl border border-violet-100 bg-white p-3">
                <p className="text-sm font-semibold text-violet-900">
                  Day {day.day}. {day.title}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {day.items.map((item, idx) => (
                    <li key={`${day.day}-${idx}`} className="text-xs text-violet-800/85">
                      <span className="mr-2 font-medium text-violet-900">{item.time}</span>
                      {item.url ? (
                        <a href={item.url} target="_blank" rel="noreferrer" className="text-fuchsia-700 hover:underline">
                          {item.name}
                        </a>
                      ) : (
                        <span>{item.name}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
