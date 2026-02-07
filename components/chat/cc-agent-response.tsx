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
    <div className="travel-agent-shell space-y-4 rounded-2xl border border-sky-200 bg-white p-4 text-slate-900 shadow-[0_14px_34px_-22px_rgba(2,132,199,0.45)]">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-sky-200 bg-gradient-to-r from-sky-50 via-cyan-50 to-teal-50 px-3 py-2">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-sky-700/80">Travel Agent</p>
          <p className="text-sm font-semibold text-slate-900">{STAGE_LABELS[response.stage] ?? response.stage}</p>
        </div>
      </div>

      {response.questions.length > 0 && (
        <section className="travel-agent-panel">
          <p className="travel-agent-section-title">추가 확인 질문</p>
          <div className="mt-3 space-y-3">
            {response.questions.map((question, index) => (
              <div
                key={question.id}
                className="travel-agent-reveal rounded-xl border border-sky-100 bg-white p-3"
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <p className="text-sm font-medium text-slate-900">{question.text}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {question.options.map((option) => (
                    <button
                      type="button"
                      key={`${question.id}-${option.value}`}
                      onClick={() => toggleOption(question.id, option.label)}
                      className={[
                        "rounded-full border px-2.5 py-1 text-xs transition",
                        selectedByQuestion[question.id]?.has(option.label)
                          ? "border-sky-500 bg-sky-500 text-white"
                          : "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100",
                      ].join(" ")}
                    >
                      {option.label}
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
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-sky-200 transition focus:ring"
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
              className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
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
                className="travel-agent-reveal rounded-xl border border-slate-200 bg-white p-3"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <a
                  href={flight.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block transition hover:-translate-y-0.5 hover:text-sky-700"
                >
                  <p className="text-sm font-semibold text-slate-900">{flight.summary}</p>
                  <p className="mt-1 text-xs text-slate-600">
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
                className="travel-agent-reveal rounded-xl border border-slate-200 bg-white p-3"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <a
                  href={stay.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block transition hover:-translate-y-0.5 hover:text-sky-700"
                >
                  <p className="text-sm font-semibold text-slate-900">{stay.name}</p>
                  <p className="mt-1 text-xs text-slate-600">
                    {stay.location.area} · 평점 {stay.rating} · {formatMoney(stay.pricePerNight.amount, stay.pricePerNight.currency)}
                  </p>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
