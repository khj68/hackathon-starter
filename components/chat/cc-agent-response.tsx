"use client";

import type { PlannerAgentResponse } from "@/lib/types";

interface CCAgentResponseProps {
  response: PlannerAgentResponse;
}

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

function findCardUrl(response: PlannerAgentResponse, refId: string): string | null {
  const flight = response.results.flights.find((item) => item.id === refId);
  if (flight) return flight.url;

  const stay = response.results.stays.find((item) => item.id === refId);
  if (stay) return stay.url;

  for (const day of response.results.routeDraft) {
    const place = day.items.find((item) => item.name === refId || item.type === "place");
    if (place?.url) return place.url;
  }

  return null;
}

export function CCAgentResponse({ response }: CCAgentResponseProps) {
  return (
    <div className="space-y-3">
      {response.questions.length > 0 && (
        <section className="rounded-md border border-border bg-card p-3">
          <p className="text-xs font-medium text-muted-foreground">추가 확인 질문</p>
          <ul className="mt-2 space-y-2 text-sm">
            {response.questions.map((question) => (
              <li key={question.id}>
                <p>{question.text}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  옵션: {question.options.map((option) => option.label).join(" / ")}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {response.results.flights.length > 0 && (
        <section className="rounded-md border border-border bg-card p-3">
          <p className="text-xs font-medium text-muted-foreground">항공 추천</p>
          <ul className="mt-2 space-y-2 text-sm">
            {response.results.flights.map((flight) => (
              <li key={flight.id} className="rounded border border-border/70 p-2">
                <p className="font-medium">{flight.summary}</p>
                <p className="text-xs text-muted-foreground">
                  {formatMoney(flight.price.amount, flight.price.currency)} · 점수 {flight.score}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {response.results.stays.length > 0 && (
        <section className="rounded-md border border-border bg-card p-3">
          <p className="text-xs font-medium text-muted-foreground">숙소 추천</p>
          <ul className="mt-2 space-y-2 text-sm">
            {response.results.stays.map((stay) => (
              <li key={stay.id} className="rounded border border-border/70 p-2">
                <p className="font-medium">{stay.name}</p>
                <p className="text-xs text-muted-foreground">
                  {stay.location.area} · 평점 {stay.rating} · {formatMoney(stay.pricePerNight.amount, stay.pricePerNight.currency)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {response.ui.cards.length > 0 && (
        <section className="rounded-md border border-border bg-card p-3">
          <p className="text-xs font-medium text-muted-foreground">바로가기</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {response.ui.cards.map((card) => {
              const href = findCardUrl(response, card.refId);
              if (!href) return null;

              return (
                <a
                  key={`${card.type}-${card.refId}`}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted"
                >
                  {card.ctaLabel}
                </a>
              );
            })}
          </div>
        </section>
      )}

      <details className="rounded-md border border-border bg-muted/30 p-3">
        <summary className="cursor-pointer text-xs text-muted-foreground">Raw JSON</summary>
        <pre className="mt-2 overflow-x-auto text-xs leading-relaxed">
          {JSON.stringify(response, null, 2)}
        </pre>
      </details>
    </div>
  );
}
