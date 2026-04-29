# @docform/api

Local REST API for DocForm document generation. The API uses Fastify as the HTTP framework and keeps document generation in `@docform/core`.

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

## Endpoints

```http
GET  /health
POST /v1/documents/generate
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

## Preview HTML

```bash
curl -X POST http://localhost:3000/v1/documents/preview \
  -H "content-type: application/json" \
  -d '{
    "template": "minimal",
    "content_markdown": "# Preview\n\nGenerated from the local API."
  }'
```
