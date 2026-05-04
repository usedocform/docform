import path from "node:path";

export type StorageDriver = "local" | "s3";

export type StorageConfig =
  | {
      driver: "local";
    }
  | {
      driver: "s3";
      endpoint?: string;
      region: string;
      bucket?: string;
      accessKeyId?: string;
      secretAccessKey?: string;
      forcePathStyle: boolean;
      prefix?: string;
      presignExpiresSeconds: number;
    };

export type ApiServerOptions = {
  cwd?: string;
  templatesRoot?: string;
  outputRoot?: string;
  apiKey?: string;
  logRequests?: boolean;
  storage?: unknown;
  storageDriver?: StorageDriver;
  s3?: Partial<Extract<StorageConfig, { driver: "s3" }>>;
  jobs?: unknown;
  redisUrl?: string;
  jobsEnabled?: boolean;
  jobsWorkerEnabled?: boolean;
  jobTtlSeconds?: number;
  jobConcurrency?: number;
};

export type ApiConfig = {
  cwd: string;
  templatesRoot: string;
  outputRoot: string;
  apiKey?: string;
  logRequests: boolean;
  storage: StorageConfig;
  storageOverride?: unknown;
  jobs: {
    enabled: boolean;
    redisUrl?: string;
    ttlSeconds: number;
    workerEnabled: boolean;
    concurrency: number;
  };
  jobsOverride?: unknown;
};

export function createApiConfig(options: ApiServerOptions = {}): ApiConfig {
  const cwd = options.cwd ?? process.env.INIT_CWD ?? process.cwd();

  return {
    cwd,
    templatesRoot: path.resolve(cwd, options.templatesRoot ?? "packages/templates-basic/templates"),
    outputRoot: path.resolve(cwd, options.outputRoot ?? process.env.DOCFORM_OUTPUT_ROOT ?? "output"),
    apiKey: normalizeOptionalString(options.apiKey ?? process.env.DOCFORM_API_KEY),
    logRequests: options.logRequests ?? process.env.DOCFORM_LOG_REQUESTS === "true",
    storage: createStorageConfig(options),
    storageOverride: options.storage,
    jobs: createJobsConfig(options),
    jobsOverride: options.jobs
  };
}

function normalizeOptionalString(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function createStorageConfig(options: ApiServerOptions): StorageConfig {
  const driver = parseStorageDriver(options.storageDriver ?? normalizeOptionalString(process.env.DOCFORM_STORAGE_DRIVER));
  if (driver === "local") {
    return { driver };
  }

  const s3 = options.s3 ?? {};

  return {
    driver,
    endpoint: normalizeOptionalString(s3.endpoint ?? process.env.DOCFORM_S3_ENDPOINT),
    region: normalizeOptionalString(s3.region ?? process.env.DOCFORM_S3_REGION) ?? "us-east-1",
    bucket: normalizeOptionalString(s3.bucket ?? process.env.DOCFORM_S3_BUCKET),
    accessKeyId: normalizeOptionalString(s3.accessKeyId ?? process.env.DOCFORM_S3_ACCESS_KEY_ID),
    secretAccessKey: normalizeOptionalString(s3.secretAccessKey ?? process.env.DOCFORM_S3_SECRET_ACCESS_KEY),
    forcePathStyle: s3.forcePathStyle ?? process.env.DOCFORM_S3_FORCE_PATH_STYLE === "true",
    prefix: normalizeOptionalString(s3.prefix ?? process.env.DOCFORM_S3_PREFIX),
    presignExpiresSeconds: parsePositiveInteger(
      String(s3.presignExpiresSeconds ?? process.env.DOCFORM_S3_PRESIGN_EXPIRES_SECONDS ?? "3600"),
      "DOCFORM_S3_PRESIGN_EXPIRES_SECONDS"
    )
  };
}

function parseStorageDriver(value: string | undefined): StorageDriver {
  if (!value || value === "local") {
    return "local";
  }

  if (value === "s3") {
    return "s3";
  }

  throw new Error('DOCFORM_STORAGE_DRIVER must be "local" or "s3".');
}

function parsePositiveInteger(value: string, name: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0 || String(parsed) !== value.trim()) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
}

function createJobsConfig(options: ApiServerOptions): ApiConfig["jobs"] {
  const redisUrl = normalizeOptionalString(options.redisUrl ?? process.env.DOCFORM_REDIS_URL);
  return {
    enabled: options.jobsEnabled ?? parseOptionalBoolean(process.env.DOCFORM_JOBS_ENABLED) ?? Boolean(redisUrl),
    redisUrl,
    ttlSeconds: options.jobTtlSeconds ?? parsePositiveInteger(process.env.DOCFORM_JOB_TTL_SECONDS ?? "86400", "DOCFORM_JOB_TTL_SECONDS"),
    workerEnabled: options.jobsWorkerEnabled ?? parseOptionalBoolean(process.env.DOCFORM_JOBS_WORKER_ENABLED) ?? false,
    concurrency: options.jobConcurrency ?? parsePositiveInteger(process.env.DOCFORM_JOB_CONCURRENCY ?? "1", "DOCFORM_JOB_CONCURRENCY")
  };
}

function parseOptionalBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  throw new Error('Boolean env vars must be "true" or "false".');
}
