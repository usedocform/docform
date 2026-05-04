import { Queue, Worker, type Job } from "bullmq";
import { Redis } from "ioredis";
import { ValidationError } from "@docform/core";
import type { ApiConfig } from "./config.js";
import { generateAndStoreDocument, type GenerateDocumentCommand, type GenerateDocumentResponse } from "./generate-document.js";

export type GenerateJobStatus = "queued" | "running" | "completed" | "failed";

export type GenerateJobRecord = {
  document_id: string;
  status: GenerateJobStatus;
  created_at: string;
  updated_at: string;
  format?: string;
  template?: string;
  file_path?: string;
  storage?: "s3";
  bucket?: string;
  key?: string;
  download_url?: string;
  stats?: {
    pages: number | null;
  };
  error?: {
    message: string;
  };
};

export type GenerateJobStore = {
  enqueue(command: GenerateDocumentCommand): Promise<void>;
  get(documentId: string): Promise<GenerateJobRecord | undefined>;
  close?(): Promise<void>;
};

type RunnableGenerateJobStore = GenerateJobStore & {
  takeNext(): Promise<GenerateDocumentCommand | undefined>;
  markRunning(documentId: string): Promise<void>;
  markCompleted(documentId: string, result: GenerateDocumentResponse): Promise<void>;
  markFailed(documentId: string, error: unknown): Promise<void>;
};

export type GenerateJobWorker = {
  start(): void;
  stop(): Promise<void>;
  processNext(): Promise<boolean>;
};

const queueName = "docform:generate";

export function createGenerateJobStore(config: ApiConfig): GenerateJobStore | undefined {
  if (config.jobsOverride) {
    return config.jobsOverride as GenerateJobStore;
  }

  if (!config.jobs.enabled) {
    return undefined;
  }

  if (!config.jobs.redisUrl) {
    throw new ValidationError("Async generation jobs require DOCFORM_REDIS_URL.");
  }

  return new BullMqGenerateJobStore(config.jobs.redisUrl, config.jobs.ttlSeconds);
}

export function createGenerateJobWorker(store: GenerateJobStore, config: ApiConfig): GenerateJobWorker {
  if (store instanceof BullMqGenerateJobStore) {
    return store.createWorker(config);
  }

  if (!isRunnableGenerateJobStore(store)) {
    throw new ValidationError("Generate job store does not support worker processing.");
  }

  const runnableStore = store;
  let timer: NodeJS.Timeout | undefined;
  let stopped = false;
  let activeRun: Promise<void> | undefined;

  async function runOnce(): Promise<boolean> {
    const command = await runnableStore.takeNext();
    if (!command) {
      return false;
    }

    await runnableStore.markRunning(command.documentId);

    try {
      const result = await generateAndStoreDocument(command, config);
      await runnableStore.markCompleted(command.documentId, result);
    } catch (error) {
      await runnableStore.markFailed(command.documentId, error);
    }

    return true;
  }

  function tick(): void {
    if (stopped || activeRun) {
      return;
    }

    activeRun = runOnce()
      .then((processed) => {
        activeRun = undefined;
        if (processed) {
          tick();
        }
      })
      .catch(() => {
        activeRun = undefined;
      });
  }

  return {
    start() {
      if (timer) {
        return;
      }

      timer = setInterval(tick, 100);
      timer.unref();
      tick();
    },
    async stop() {
      stopped = true;
      if (timer) {
        clearInterval(timer);
      }
      await activeRun;
    },
    processNext: runOnce
  };
}

export class InMemoryGenerateJobStore implements GenerateJobStore {
  private readonly jobs = new Map<string, GenerateJobRecord>();
  private readonly queue: GenerateDocumentCommand[] = [];

  async enqueue(command: GenerateDocumentCommand): Promise<void> {
    const now = new Date().toISOString();
    this.jobs.set(command.documentId, {
      document_id: command.documentId,
      status: "queued",
      created_at: now,
      updated_at: now,
      format: command.format,
      template: command.templateId
    });
    this.queue.push(command);
  }

  async takeNext(): Promise<GenerateDocumentCommand | undefined> {
    return this.queue.shift();
  }

  async get(documentId: string): Promise<GenerateJobRecord | undefined> {
    return this.jobs.get(documentId);
  }

  async markRunning(documentId: string): Promise<void> {
    await this.update(documentId, { status: "running" });
  }

  async markCompleted(documentId: string, result: GenerateDocumentResponse): Promise<void> {
    await this.update(documentId, {
      ...toCompletedJobRecord(result),
      status: "completed"
    });
  }

  async markFailed(documentId: string, error: unknown): Promise<void> {
    await this.update(documentId, {
      status: "failed",
      error: {
        message: error instanceof Error ? error.message : String(error)
      }
    });
  }

  private async update(documentId: string, patch: Partial<GenerateJobRecord>): Promise<void> {
    const current = this.jobs.get(documentId);
    if (!current) {
      return;
    }

    this.jobs.set(documentId, {
      ...current,
      ...patch,
      updated_at: new Date().toISOString()
    });
  }
}

class BullMqGenerateJobStore implements GenerateJobStore {
  private readonly queue: Queue<GenerateDocumentCommand, GenerateDocumentResponse>;

  constructor(redisUrl: string, private readonly ttlSeconds: number) {
    this.queue = new Queue<GenerateDocumentCommand, GenerateDocumentResponse>(queueName, {
      connection: createBullMqRedisConnection(redisUrl)
    });
  }

  async enqueue(command: GenerateDocumentCommand): Promise<void> {
    await this.queue.add("generate", command, {
      jobId: command.documentId,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000
      },
      removeOnComplete: {
        age: this.ttlSeconds
      },
      removeOnFail: {
        age: this.ttlSeconds
      }
    });
  }

  async get(documentId: string): Promise<GenerateJobRecord | undefined> {
    const job = await this.queue.getJob(documentId);
    return job ? toGenerateJobRecord(job) : undefined;
  }

  async close(): Promise<void> {
    await this.queue.close();
  }

  createWorker(config: ApiConfig): GenerateJobWorker {
    let worker: Worker<GenerateDocumentCommand, GenerateDocumentResponse> | undefined;

    return {
      start() {
        if (worker) {
          return;
        }

        worker = new Worker<GenerateDocumentCommand, GenerateDocumentResponse>(
          queueName,
          async (job) => generateAndStoreDocument(job.data, config),
          {
            connection: createBullMqRedisConnection(config.jobs.redisUrl),
            concurrency: config.jobs.concurrency
          }
        );
      },
      async stop() {
        await worker?.close();
      },
      async processNext() {
        throw new ValidationError("BullMQ workers process jobs continuously.");
      }
    };
  }
}

function isRunnableGenerateJobStore(store: GenerateJobStore): store is RunnableGenerateJobStore {
  return (
    "takeNext" in store &&
    "markRunning" in store &&
    "markCompleted" in store &&
    "markFailed" in store &&
    typeof store.takeNext === "function" &&
    typeof store.markRunning === "function" &&
    typeof store.markCompleted === "function" &&
    typeof store.markFailed === "function"
  );
}

function createBullMqRedisConnection(redisUrl: string | undefined): Redis {
  if (!redisUrl) {
    throw new ValidationError("BullMQ generation jobs require DOCFORM_REDIS_URL.");
  }

  return new Redis(redisUrl, {
    maxRetriesPerRequest: null
  });
}

async function toGenerateJobRecord(job: Job<GenerateDocumentCommand, GenerateDocumentResponse>): Promise<GenerateJobRecord> {
  const state = await job.getState();
  const base: GenerateJobRecord = {
    document_id: job.data.documentId,
    status: toGenerateJobStatus(state),
    created_at: new Date(job.timestamp).toISOString(),
    updated_at: new Date(job.finishedOn ?? job.processedOn ?? job.timestamp).toISOString(),
    format: job.data.format,
    template: job.data.templateId
  };

  if (state === "completed") {
    return {
      ...base,
      ...toCompletedJobRecord(job.returnvalue),
      status: "completed"
    };
  }

  if (state === "failed") {
    return {
      ...base,
      status: "failed",
      error: {
        message: job.failedReason ?? "Job failed."
      }
    };
  }

  return base;
}

function toGenerateJobStatus(state: string): GenerateJobStatus {
  if (state === "active") {
    return "running";
  }

  if (state === "completed" || state === "failed") {
    return state;
  }

  return "queued";
}

function toCompletedJobRecord(result: GenerateDocumentResponse): Partial<GenerateJobRecord> {
  return {
    format: result.format,
    template: result.template,
    file_path: result.file_path,
    storage: result.storage,
    bucket: result.storage === "s3" ? result.bucket : undefined,
    key: result.storage === "s3" ? result.key : undefined,
    download_url: result.storage === "s3" ? result.download_url : undefined,
    stats: result.stats
  };
}
