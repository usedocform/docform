# @docform/sdk-js

JavaScript/TypeScript SDK for integrating product code with the DocForm REST API. Current package version: `0.2.0`.

## Usage

Run the DocForm API first:

```bash
docform serve
```

Then use the SDK from a Node.js/TypeScript project:

```ts
import { createDocFormClient } from "@docform/sdk-js";

const docform = createDocFormClient({
  baseUrl: "http://localhost:3000",
  apiKey: process.env.DOCFORM_API_KEY
});

const result = await docform.generateDocument({
  contentMarkdown: "# Report\n\nHello from product code.",
  template: "minimal",
  format: "docx"
});

console.log(result.filePath);
console.log(result.downloadUrl);
```

## API

```ts
const client = createDocFormClient({ baseUrl: "http://localhost:3000" });

await client.generateDocument({
  contentMarkdown: "# Report",
  template: "minimal",
  format: "pdf"
});

const queued = await client.generateDocument({
  mode: "async",
  contentMarkdown: "# Report",
  template: "minimal",
  format: "pdf"
});

const status = await client.getDocumentStatus(queued.documentId);

await client.previewDocument({
  contentMarkdown: "# Preview",
  template: "minimal"
});

await client.listTemplates();
await client.getTemplate("minimal");
```

`apiKey` is optional. When set, the SDK sends it as `Authorization: Bearer <key>` for self-hosted APIs protected by `DOCFORM_API_KEY`.

When the REST API uses S3-compatible storage, `generateDocument` also returns `storage`, `bucket`, `key`, and `downloadUrl`. Local storage responses keep using `filePath`.

Async generation returns `{ documentId, status: "queued" }` first. Poll `getDocumentStatus(documentId)` until the status is `completed` or `failed`. Completed async responses use the same local/S3 result fields as synchronous generation.

The SDK is a typed client for the existing REST API. It does not parse Markdown or render PDF/DOCX files directly.
