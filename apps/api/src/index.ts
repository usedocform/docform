import { fileURLToPath } from "node:url";
import path from "node:path";
import { createApiServer } from "./server.js";

export { createApiServer, type ApiServerOptions } from "./server.js";

const isMain = process.argv[1] ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;

if (isMain) {
  const port = Number.parseInt(process.env.PORT ?? "3000", 10);
  const server = createApiServer({
    templatesRoot: process.env.DOCFORM_TEMPLATES_ROOT,
    outputRoot: process.env.DOCFORM_OUTPUT_ROOT
  });

  server
    .listen({ port, host: "0.0.0.0" })
    .then((address) => {
      console.log(`DocForm API listening on ${address}`);
    })
    .catch((error: unknown) => {
      server.log.error(error);
      process.exitCode = 1;
    });
}
