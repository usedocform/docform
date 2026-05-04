import { createReadStream } from "node:fs";
import path from "node:path";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ValidationError } from "@docform/core";
import type { ApiConfig, StorageConfig } from "./config.js";

type ReadyS3StorageConfig = Extract<StorageConfig, { driver: "s3" }> & {
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
};

export type StoredDocument =
  | {
      storage?: undefined;
      file_path: string;
    }
  | {
      storage: "s3";
      file_path: string;
      bucket: string;
      key: string;
      download_url: string;
    };

export type StoreGeneratedDocumentInput = {
  documentId: string;
  format: string;
  localPath: string;
};

export type DocumentStorage = {
  resolveOutputPath(input: { documentId: string; format: string; requestedPath?: string }): string;
  storeGeneratedDocument(input: StoreGeneratedDocumentInput): Promise<StoredDocument>;
};

export function createDocumentStorage(config: ApiConfig): DocumentStorage {
  return (config.storageOverride as DocumentStorage | undefined) ?? createConfiguredStorage(config);
}

function createConfiguredStorage(config: ApiConfig): DocumentStorage {
  if (config.storage.driver === "s3") {
    return new S3DocumentStorage(config);
  }

  return new LocalDocumentStorage(config);
}

class LocalDocumentStorage implements DocumentStorage {
  constructor(private readonly config: ApiConfig) {}

  resolveOutputPath(input: { documentId: string; format: string; requestedPath?: string }): string {
    if (input.requestedPath) {
      return path.resolve(this.config.cwd, input.requestedPath);
    }

    return path.join(this.config.outputRoot, `${input.documentId}.${input.format}`);
  }

  async storeGeneratedDocument(input: StoreGeneratedDocumentInput): Promise<StoredDocument> {
    return {
      file_path: path.relative(this.config.cwd, input.localPath)
    };
  }
}

class S3DocumentStorage implements DocumentStorage {
  private readonly storage: ReadyS3StorageConfig;
  private readonly client: S3Client;

  constructor(private readonly config: ApiConfig) {
    if (config.storage.driver !== "s3") {
      throw new ValidationError("S3 storage config is required.");
    }

    assertS3StorageReady(config.storage);

    this.storage = config.storage;
    this.client = new S3Client({
      endpoint: this.storage.endpoint,
      region: this.storage.region,
      forcePathStyle: this.storage.forcePathStyle,
      credentials: {
        accessKeyId: this.storage.accessKeyId,
        secretAccessKey: this.storage.secretAccessKey
      }
    });
  }

  resolveOutputPath(input: { documentId: string; format: string }): string {
    return path.join(this.config.outputRoot, "tmp", `${input.documentId}.${input.format}`);
  }

  async storeGeneratedDocument(input: StoreGeneratedDocumentInput): Promise<StoredDocument> {
    const bucket = this.storage.bucket;
    const key = createS3Key(this.storage.prefix, input.documentId, input.format);

    await this.client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: createReadStream(input.localPath),
        ContentType: contentTypeForFormat(input.format)
      })
    );

    const downloadUrl = await getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: bucket,
        Key: key
      }),
      {
        expiresIn: this.storage.presignExpiresSeconds
      }
    );

    return {
      storage: "s3",
      file_path: `s3://${bucket}/${key}`,
      bucket,
      key,
      download_url: downloadUrl
    };
  }
}

export function getS3Readiness(config: StorageConfig): "ok" | "error" {
  if (config.driver === "local") {
    return "ok";
  }

  return hasCompleteS3Config(config) ? "ok" : "error";
}

function assertS3StorageReady(config: Extract<StorageConfig, { driver: "s3" }>): asserts config is ReadyS3StorageConfig {
  if (!hasCompleteS3Config(config)) {
    throw new ValidationError(
      "S3 storage requires DOCFORM_S3_BUCKET, DOCFORM_S3_ACCESS_KEY_ID, and DOCFORM_S3_SECRET_ACCESS_KEY."
    );
  }
}

function hasCompleteS3Config(config: Extract<StorageConfig, { driver: "s3" }>): config is ReadyS3StorageConfig {
  return Boolean(config.bucket && config.accessKeyId && config.secretAccessKey);
}

function createS3Key(prefix: string | undefined, documentId: string, format: string): string {
  const filename = `${documentId}.${format}`;
  if (!prefix) {
    return filename;
  }

  return `${prefix.replace(/^\/+|\/+$/g, "")}/${filename}`;
}

function contentTypeForFormat(format: string): string {
  if (format === "pdf") {
    return "application/pdf";
  }

  if (format === "docx") {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }

  return "application/octet-stream";
}
