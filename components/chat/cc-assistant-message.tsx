"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";
import type {
  AssistantMessage,
  ContentBlock,
  ToolResultBlock,
  PlannerAgentResponse,
} from "@/lib/types";
import {
  isTextBlock,
  isThinkingBlock,
  isToolUseBlock,
  isPlannerAgentResponse,
} from "@/lib/types";
import { MemoizedMarkdown } from "./markdown";
import { CCThinkingBlock } from "./cc-thinking-block";
import { CCToolUseBlock } from "./cc-tool-use-block";
import { CCAgentResponse } from "./cc-agent-response";

interface CCAssistantMessageProps {
  message: AssistantMessage;
  mergedContent?: ContentBlock[];
  toolResults?: Map<string, ToolResultBlock>;
  isStreaming?: boolean;
  className?: string;
  onSubmitSelections?: (message: string) => void;
}

type GroupedContent =
  | { type: "text"; text: string }
  | { type: "thinking"; block: ContentBlock }
  | { type: "tool-use"; block: ContentBlock; result?: ToolResultBlock };

function groupContentBlocks(
  blocks: ContentBlock[],
  toolResults?: Map<string, ToolResultBlock>
): GroupedContent[] {
  const groups: GroupedContent[] = [];
  let currentText = "";

  for (const block of blocks) {
    if (isTextBlock(block)) {
      currentText += block.text;
    } else {
      // Flush accumulated text
      if (currentText) {
        groups.push({ type: "text", text: currentText });
        currentText = "";
      }

      if (isThinkingBlock(block)) {
        groups.push({ type: "thinking", block });
      } else if (isToolUseBlock(block)) {
        const result = toolResults?.get(block.id);
        groups.push({ type: "tool-use", block, result });
      }
    }
  }

  // Don't forget remaining text
  if (currentText) {
    groups.push({ type: "text", text: currentText });
  }

  return groups;
}

function tryParsePlannerResponse(blocks: ContentBlock[]): PlannerAgentResponse | null {
  const text = blocks
    .filter(isTextBlock)
    .map((block) => block.text)
    .join("\n")
    .trim();

  if (!text) return null;

  try {
    const parsed = JSON.parse(text);
    if (isPlannerAgentResponse(parsed)) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Claude Code Assistant Message Component
 */
export function CCAssistantMessage({
  message,
  mergedContent,
  toolResults,
  isStreaming = false,
  className,
  onSubmitSelections,
}: CCAssistantMessageProps) {
  const content = mergedContent ?? message.message.content;

  const resultsMap = useMemo(() => {
    if (toolResults) return toolResults;
    return new Map<string, ToolResultBlock>();
  }, [toolResults]);

  const groups = useMemo(
    () => groupContentBlocks(content, resultsMap),
    [content, resultsMap]
  );
  const plannerResponse = useMemo(() => tryParsePlannerResponse(content), [content]);

  // Handle API error messages
  if (message.isApiErrorMessage) {
    const errorContent = content
      .filter(isTextBlock)
      .map((b) => b.text)
      .join("\n");

    const errorTitle = message.error === "billing_error"
      ? "Billing Error"
      : "API Error";

    return (
      <div
        className={cn(
          "flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive",
          className
        )}
      >
        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
        <div className="flex-1">
          <div className="font-medium">{errorTitle}</div>
          {errorContent && (
            <div className="mt-1 text-xs opacity-90 whitespace-pre-wrap">
              {errorContent}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (groups.length === 0) {
    return null;
  }

  if (plannerResponse) {
    return (
      <div className={cn("px-3 py-2", className)}>
        <CCAgentResponse response={plannerResponse} onSubmitSelections={onSubmitSelections} />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {groups.map((group, index) => {
        if (group.type === "text") {
          return (
            <div key={`text-${index}`} className="px-3 py-2 text-sm">
              <MemoizedMarkdown
                content={group.text}
                id={`${message.uuid}-text-${index}`}
              />
            </div>
          );
        }

        if (group.type === "thinking" && isThinkingBlock(group.block)) {
          const isLatest = index === groups.length - 1;
          return (
            <CCThinkingBlock
              key={`thinking-${index}`}
              block={group.block}
              isLoading={isStreaming && isLatest}
              defaultOpen={isStreaming && isLatest}
            />
          );
        }

        if (group.type === "tool-use" && isToolUseBlock(group.block)) {
          return (
            <CCToolUseBlock
              key={`tool-${group.block.id}`}
              block={group.block}
              result={group.result}
              isLoading={isStreaming && !group.result}
            />
          );
        }

        return null;
      })}
    </div>
  );
}
