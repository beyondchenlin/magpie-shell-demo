import type { AmModel } from "../components/AgentModelsPop";

/** User-provided 2026-10-17 screenshot fixture, never host detection results. */
export const COMPARISON_AGENTS = [
  { id: "codex", name: "Codex", icon: "codex-color", connectable: true, version: "CLI 0.161.0  App 26.1007.9446.0" },
  { id: "pi", name: "Pi", icon: "pi", connectable: false, missing: true },
  { id: "cursor", name: "Cursor CLI", icon: "cursor", connectable: false, version: "2026.10.14-941492e" },
  { id: "deepseek", name: "DeepSeek Harness", icon: "deepseek-color", connectable: true },
  { id: "workbuddy", name: "WorkBuddy", icon: "workbuddy-color", connectable: true },
] as const;

export const COMPARISON_MODELS: Record<string, AmModel[]> = {
  codex: [{ id: "gpt-6.1-sol", name: "gpt-6.1-sol", group: "Codex", icon: "codex-color", on: true }],
  deepseek: [{ id: "default", name: "Default", group: "DeepSeek Harness", icon: "deepseek-color", on: true }],
  workbuddy: [{ id: "default", name: "Default", group: "WorkBuddy", icon: "workbuddy-color", on: true }],
};

export function isAgentComparison(): boolean {
  return new URLSearchParams(location.search).get("comparison") === "2026-10-17";
}
