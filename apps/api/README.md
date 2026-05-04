# @docform/api

Local REST API for DocForm document generation. Current package version: `0.5.0`.

The API uses Fastify as the HTTP framework and keeps document generation in `@docform/core`.

## Run Locally

```bash
pnpm api
```

The API listens on `http://localhost:3000` by default. Override the port with:

```bash
PORT=3001 pnpm api
```

## Run With Docker

```bash
pnpm api:docker
```

Generated files are written to `output/`.

For a production-oriented self-hosted runtime with Redis-backed async jobs:

```bash
pnpm api:docker:prod
```

The production compose file starts three services: `api`, `worker`, and `redis`. The API accepts HTTP requests and enqueues async document generation jobs. The worker consumes those jobs through BullMQ.

## Endpoints

```http
GET  /health
GET  /ready
POST /v1/documents/generate
GET  /v1/documents/{id}
POST /v1/documents/preview
GET  /v1/templates
GET  /v1/templates/{id}
```

## Generate PDF

```bash
curl -X POST http://localhost:3000/v1/documents/generate \
  -H "content-type: application/json" \
  -d '{
    "format": "pdf",
    "template": "minimal",
    "content_markdown": "# API Report\n\nGenerated from the local API."
  }'
```

The default generate mode is synchronous and returns a completed document response with `file_path`.

## Async Generate

Use `mode: "async"` to queue generation and poll the document status:

```bash
curl -X POST http://localhost:3000/v1/documents/generate \
  -H "content-type: application/json" \
  -d '{
    "mode": "async",
    "format": "pdf",
    "template": "minimal",
    "content_markdown": "# Async API Report\n\nGenerated from the local API."
  }'
```

Response:

```json
{
  "document_id": "doc_123",
  "status": "queued"
}
```

Poll status:

```bash
curl http://localhost:3000/v1/documents/doc_123
```

Async jobs use BullMQ with Redis when `DOCFORM_REDIS_URL` is configured. The API enqueues jobs, and the worker process consumes them:

```bash
DOCFORM_REDIS_URL=redis://localhost:6379 pnpm api
DOCFORM_REDIS_URL=redis://localhost:6379 pnpm api:worker
```

Relevant settings:

```bash
DOCFORM_REDIS_URL=redis://redis:6379
DOCFORM_JOBS_ENABLED=true
DOCFORM_JOB_TTL_SECONDS=86400
DOCFORM_JOB_CONCURRENCY=1
```

For local tests or embedded runtimes, `DOCFORM_JOBS_WORKER_ENABLED=true` starts a worker inside the API process. Production should prefer the separate worker service from `docker-compose.prod.yml`.

## S3-Compatible Storage

Set `DOCFORM_STORAGE_DRIVER=s3` to store generated REST API documents in S3-compatible storage. Configure:

```bash
DOCFORM_S3_ENDPOINT=http://minio:9000
DOCFORM_S3_REGION=us-east-1
DOCFORM_S3_BUCKET=docform-output
DOCFORM_S3_ACCESS_KEY_ID=minioadmin
DOCFORM_S3_SECRET_ACCESS_KEY=minioadmin
DOCFORM_S3_FORCE_PATH_STYLE=true
```

In S3 mode, completed generate responses include `storage`, `bucket`, `key`, and presigned `download_url`.

## Preview HTML

```bash
curl -X POST http://localhost:3000/v1/documents/preview \
  -H "content-type: application/json" \
  -d '{
    "template": "minimal",
    "content_markdown": "# Preview\n\nGenerated from the local API."
  }'
```
