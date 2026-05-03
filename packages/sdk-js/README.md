# @docform/sdk-js

JavaScript/TypeScript SDK for integrating product code with the DocForm REST API.

## Usage

Run the DocForm API first:

```bash
docform serve
```

Then use the SDK from a Node.js/TypeScript project:

```ts
import { createDocFormClient } from "@docform/sdk-js";

const docform = createDocFormClient({
  baseUrl: "http://localhost:3000"
});

const result = await docform.generateDocument({
  contentMarkdown: "# Report\n\nHello from product code.",
  template: "minimal",
  format: "docx"
});

console.log(result.filePath);
```

## API

```ts
const client = createDocFormClient({ baseUrl: "http://localhost:3000" });

await client.generateDocument({
  contentMarkdown: "# Report",
  template: "minimal",
  format: "pdf"
});

await client.previewDocument({
  contentMarkdown: "# Preview",
  template: "minimal"
});

await client.listTemplates();
await client.getTemplate("minimal");
```

The SDK is a typed client for the existing REST API. It does not parse Markdown or render PDF/DOCX files directly.
