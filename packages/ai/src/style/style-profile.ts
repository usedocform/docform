export type StyleTone = "office" | "formal" | "minimal" | "sales";

export type StyleProfile = {
  tone: StyleTone;
  density?: "compact" | "normal";
  fontScale?: "compact" | "normal" | "large";
  accentColor?: string;
};
