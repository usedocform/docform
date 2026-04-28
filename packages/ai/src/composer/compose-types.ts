import type { DocumentModel } from "@docform/core";
import type { AiTokenUsage } from "../providers/ai-provider.js";
import type { StyleProfile } from "../style/style-profile.js";

export type { AiTokenUsage };

export type AiComposedDocument = {
  document: DocumentModel;
  templateId: string;
  styleProfile: StyleProfile;
};
