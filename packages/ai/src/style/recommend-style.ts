import type { StyleProfile, StyleTone } from "./style-profile.js";

export function recommendStyle(instruction: string, requestedStyle?: string): StyleProfile {
  const tone = normalizeTone(requestedStyle) ?? inferTone(instruction);

  return {
    tone,
    density: tone === "office" || tone === "formal" ? "normal" : "compact",
    fontScale: "normal"
  };
}

function inferTone(instruction: string): StyleTone {
  const normalized = instruction.toLowerCase();
  if (normalized.includes("офис") || normalized.includes("office")) {
    return "office";
  }
  if (normalized.includes("форм") || normalized.includes("formal") || normalized.includes("делов")) {
    return "formal";
  }
  if (normalized.includes("продаж") || normalized.includes("sales")) {
    return "sales";
  }

  return "minimal";
}

export function normalizeTone(value: string | undefined): StyleTone | undefined {
  if (value === "office" || value === "formal" || value === "minimal" || value === "sales") {
    return value;
  }

  return undefined;
}
