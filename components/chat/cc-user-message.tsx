"use client";

import { cn } from "@/lib/utils";
import type { UserMessage, ContentBlock } from "@/lib/types";
import { isTextBlock, isImageBlock } from "@/lib/types";

interface CCUserMessageProps {
  message: UserMessage;
  className?: string;
}

/**
 * Extract text content from content blocks
 */
function extractTextFromBlocks(blocks: ContentBlock[]): string {
  return blocks
    .filter(isTextBlock)
    .map((block) => block.text)
    .join("\n");
}

const QUESTION_LABEL_MAP: Record<string, string> = {
  q_trip_purpose: "여행 목적",
  q_budget_style: "예산 성향",
  q_trip_pace: "일정 밀도",
  q_destination_region: "여행지",
  q_must_visit: "필수 방문지",
  q_date_range: "여행 날짜",
  q_date_flexibility: "날짜 유동성",
  q_travelers: "인원 구성",
  q_origin: "출발지",
  q_comfort: "숙소/좌석 선호",
  q_flight_constraints: "항공 제약",
  q_route_offer: "경로 추천 진행 여부",
  q_route_stay_area: "숙소 위치",
};

const VALUE_LABEL_MAP: Record<string, string> = {
  relax: "휴양",
  sightseeing: "관광",
  food: "미식",
  business: "비즈니스",
  budget: "가성비",
  balanced: "균형",
  premium: "프리미엄",
  relaxed: "여유롭게",
  tight: "빡빡하게",
  landmark: "랜드마크 1~2곳",
  food_shopping: "쇼핑/맛집 위주",
  none: "없음",
  undecided: "미정",
  fixed_dates: "정해짐",
  this_month: "이번 달",
  ICN: "인천(ICN)",
  GMP: "김포(GMP)",
  direct: "직항 우선",
  one_transfer: "1회 경유까지",
  avoid_redeye: "야간편 피하기",
  route_yes: "지금 추천해줘",
  stay_first: "숙소 먼저 고를래",
  route_later: "나중에 볼게",
  stay_center: "시내 중심으로",
  stay_transit: "역세권 위주로",
  stay_scenic: "해변/자연 근처로",
  stay_undecided: "아직 미정",
};

function isStructuredSelectionPayload(text: string): boolean {
  return text
    .split("\n")
    .map((line) => line.trim())
    .some((line) => /^q_[a-z_]+\s*=/.test(line));
}

function prettifyStructuredSelections(text: string): string {
  const prettyLines: string[] = [];

  for (const line of text.split("\n").map((value) => value.trim()).filter(Boolean)) {
    if (!/^q_[a-z_]+\s*=/.test(line)) {
      if (line.startsWith("추가 입력:")) {
        prettyLines.push(line);
      }
      continue;
    }

    const [rawId, rawValues] = line.split("=");
    const questionId = (rawId || "").trim();
    const valueText = rawValues || "";
    const values = (valueText.includes("|") ? valueText.split("|") : valueText.split(","))
      .map((value) => {
        try {
          return decodeURIComponent(value.trim());
        } catch {
          return value.trim();
        }
      })
      .filter(Boolean);

    if (values.length === 0) continue;

    const questionLabel = QUESTION_LABEL_MAP[questionId] || questionId;
    const mappedValues = values.map((value) => VALUE_LABEL_MAP[value] || value);
    prettyLines.push(`${questionLabel}: ${mappedValues.join(", ")}`);
  }

  return prettyLines.length > 0 ? prettyLines.join("\n") : text;
}

/**
 * Extract images from content blocks
 */
function extractImagesFromBlocks(
  blocks: ContentBlock[]
): Array<{ mediaType: string; data: string }> {
  return blocks.filter(isImageBlock).map((block) => ({
    mediaType: block.source.media_type,
    data: block.source.data,
  }));
}

/**
 * Claude Code User Message Component
 */
export function CCUserMessage({ message, className }: CCUserMessageProps) {
  const content = message.message.content;

  // Handle string content vs array content
  const textContent =
    typeof content === "string" ? content : extractTextFromBlocks(content);
  const displayText = isStructuredSelectionPayload(textContent)
    ? prettifyStructuredSelections(textContent)
    : textContent;

  // Extract images from content
  const images =
    typeof content === "string" ? [] : extractImagesFromBlocks(content);

  return (
    <div
      className={cn(
        "relative w-full rounded-2xl p-px",
        "user-message-border user-message-shadow",
        className
      )}
    >
      <div className="from-card/10 to-card relative z-0 w-full overflow-clip rounded-2xl bg-gradient-to-t px-3 py-2 text-sm text-violet-900">
        {/* Images */}
        {images.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {images.map((img, i) => (
              <div
                key={i}
                className="relative overflow-hidden rounded-md border border-border/50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:${img.mediaType};base64,${img.data}`}
                  alt={`Attached image ${i + 1}`}
                  className="max-h-48 w-auto object-contain"
                />
              </div>
            ))}
          </div>
        )}
        {/* Text */}
        {displayText && <div className="whitespace-pre-wrap">{displayText}</div>}
      </div>
      <div className="bg-background absolute inset-px -z-10 rounded-[calc(var(--radius)+1px)]" />
    </div>
  );
}
