import { describe, expect, it } from "vitest";
import {
  MockAiProvider,
  OllamaProvider,
  OpenAiCompatibleProvider,
  createAiProvider,
  resolveAiProviderConfig
} from "../src/index.js";

describe("createAiProvider", () => {
  it("creates a mock provider", () => {
    const provider = createAiProvider({ provider: "mock", model: "test-model" });

    expect(provider).toBeInstanceOf(MockAiProvider);
    expect(provider.model).toBe("test-model");
  });

  it("creates an OpenAI-compatible provider", () => {
    const provider = createAiProvider({ provider: "openai-compatible" });

    expect(provider).toBeInstanceOf(OpenAiCompatibleProvider);
  });

  it("creates an Ollama provider", () => {
    const provider = createAiProvider({ provider: "ollama", model: "llama3.1" });

    expect(provider).toBeInstanceOf(OllamaProvider);
    expect(provider.model).toBe("llama3.1");
  });
});

describe("resolveAiProviderConfig", () => {
  it("uses explicit config before env", () => {
    const resolved = resolveAiProviderConfig(
      { provider: "mock", model: "from-config" },
      {
        DOCFORM_AI_PROVIDER: "ollama",
        DOCFORM_AI_MODEL: "from-env"
      }
    );

    expect(resolved.provider).toBe("mock");
    expect(resolved.model).toBe("from-config");
  });

  it("uses env when config is missing", () => {
    const resolved = resolveAiProviderConfig(
      {},
      {
        DOCFORM_AI_PROVIDER: "ollama",
        DOCFORM_AI_MODEL: "llama3.1",
        DOCFORM_AI_BASE_URL: "http://localhost:11434",
        DOCFORM_AI_API_KEY: "secret"
      }
    );

    expect(resolved).toMatchObject({
      provider: "ollama",
      model: "llama3.1",
      baseUrl: "http://localhost:11434",
      apiKey: "secret"
    });
  });

  it("defaults to an OpenAI-compatible provider when config and env are missing", () => {
    const resolved = resolveAiProviderConfig({}, {});

    expect(resolved.provider).toBe("openai-compatible");
  });
});
