export type DocumentFormat = "pdf" | "docx";

export type DocFormClientOptions = {
  baseUrl: string;
  fetch?: FetchLike;
  headers?: Record<string, string>;
};

export type GenerateDocumentInput = {
  contentMarkdown: string;
  template?: string;
  format?: DocumentFormat;
  outputPath?: string;
};

export type GenerateDocumentResult = {
  documentId: string;
  status: string;
  format: DocumentFormat;
  template: string;
  filePath: string;
  stats?: {
    pages: number | null;
  };
};

export type PreviewDocumentInput = {
  contentMarkdown: string;
  template?: string;
};

export type PreviewDocumentResult = {
  documentId: string;
  status: string;
  format: "html";
  template: string;
  html: string;
};

export type TemplateSummary = {
  id: string;
  name: string;
  version: string;
  formats: string[];
  layout?: Record<string, unknown>;
  design?: Record<string, unknown>;
  source: string;
};

export type TemplateDetails = TemplateSummary & {
  defaultOptions?: Record<string, unknown>;
};

export type DocFormClient = {
  generateDocument(input: GenerateDocumentInput): Promise<GenerateDocumentResult>;
  previewDocument(input: PreviewDocumentInput): Promise<PreviewDocumentResult>;
  listTemplates(): Promise<TemplateSummary[]>;
  getTemplate(id: string): Promise<TemplateDetails>;
};

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

type ApiErrorResponse = {
  error?: {
    code?: unknown;
    message?: unknown;
  };
};

type GenerateDocumentApiResponse = {
  document_id: string;
  status: string;
  format: DocumentFormat;
  template: string;
  file_path: string;
  stats?: {
    pages: number | null;
  };
};

type PreviewDocumentApiResponse = {
  document_id: string;
  status: string;
  format: "html";
  template: string;
  html: string;
};

type TemplateApiResponse = {
  id: string;
  name: string;
  version: string;
  formats: string[];
  default_options?: Record<string, unknown>;
  layout?: Record<string, unknown>;
  design?: Record<string, unknown>;
  source: string;
};

type ListTemplatesApiResponse = {
  templates: TemplateApiResponse[];
};

export class DocFormSdkError extends Error {
  readonly code: string;
  readonly status?: number;

  constructor(message: string, options: { code: string; status?: number; cause?: unknown }) {
    super(message, { cause: options.cause });
    this.name = "DocFormSdkError";
    this.code = options.code;
    this.status = options.status;
  }
}

export function createDocFormClient(options: DocFormClientOptions): DocFormClient {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const fetchFn = options.fetch ?? globalThis.fetch;

  if (!fetchFn) {
    throw new DocFormSdkError("A fetch implementation is required.", {
      code: "FETCH_UNAVAILABLE"
    });
  }

  const request = createRequester(baseUrl, fetchFn, options.headers ?? {});

  return {
    async generateDocument(input) {
      const response = await request<GenerateDocumentApiResponse>("/v1/documents/generate", {
        method: "POST",
        body: {
          content_markdown: input.contentMarkdown,
          template: input.template,
          format: input.format,
          output_path: input.outputPath
        }
      });

      return {
        documentId: response.document_id,
        status: response.status,
        format: response.format,
        template: response.template,
        filePath: response.file_path,
        stats: response.stats
      };
    },

    async previewDocument(input) {
      const response = await request<PreviewDocumentApiResponse>("/v1/documents/preview", {
        method: "POST",
        body: {
          content_markdown: input.contentMarkdown,
          template: input.template
        }
      });

      return {
        documentId: response.document_id,
        status: response.status,
        format: response.format,
        template: response.template,
        html: response.html
      };
    },

    async listTemplates() {
      const response = await request<ListTemplatesApiResponse>("/v1/templates", {
        method: "GET"
      });

      return response.templates.map(toTemplateSummary);
    },

    async getTemplate(id) {
      const response = await request<TemplateApiResponse>(`/v1/templates/${encodeURIComponent(id)}`, {
        method: "GET"
      });

      return toTemplateDetails(response);
    }
  };
}

function createRequester(baseUrl: string, fetchFn: FetchLike, headers: Record<string, string>) {
  return async function requestJson<T>(
    path: string,
    options: {
      method: "GET" | "POST";
      body?: Record<string, unknown>;
    }
  ): Promise<T> {
    const requestHeaders: Record<string, string> = {
      accept: "application/json",
      ...headers
    };

    let body: string | undefined;
    if (options.body) {
      requestHeaders["content-type"] = "application/json";
      body = JSON.stringify(removeUndefinedValues(options.body));
    }

    let response: Response;
    try {
      response = await fetchFn(`${baseUrl}${path}`, {
        method: options.method,
        headers: requestHeaders,
        body
      });
    } catch (error) {
      throw new DocFormSdkError("DocForm API request failed.", {
        code: "NETWORK_ERROR",
        cause: error
      });
    }

    const responseBody = await readJson(response);
    if (!response.ok) {
      throw toSdkError(response, responseBody);
    }

    return responseBody as T;
  };
}

function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim();
  if (!trimmed) {
    throw new DocFormSdkError("baseUrl is required.", {
      code: "INVALID_OPTIONS"
    });
  }

  return trimmed.replace(/\/+$/, "");
}

function removeUndefinedValues(values: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined));
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw new DocFormSdkError("DocForm API returned invalid JSON.", {
      code: "INVALID_JSON",
      status: response.status,
      cause: error
    });
  }
}

function toSdkError(response: Response, body: unknown): DocFormSdkError {
  const apiError = body as ApiErrorResponse;
  const code = typeof apiError?.error?.code === "string" ? apiError.error.code : "API_ERROR";
  const message = typeof apiError?.error?.message === "string" ? apiError.error.message : "DocForm API request failed.";

  return new DocFormSdkError(message, {
    code,
    status: response.status
  });
}

function toTemplateSummary(template: TemplateApiResponse): TemplateSummary {
  return {
    id: template.id,
    name: template.name,
    version: template.version,
    formats: template.formats,
    layout: template.layout,
    design: template.design,
    source: template.source
  };
}

function toTemplateDetails(template: TemplateApiResponse): TemplateDetails {
  return {
    ...toTemplateSummary(template),
    defaultOptions: template.default_options
  };
}
