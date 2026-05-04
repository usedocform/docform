import { fileURLToPath } from "node:url";
import path from "node:path";
import { createApiConfig } from "./config.js";
import { createGenerateJobStore, createGenerateJobWorker } from "./jobs.js";

export async function startGenerateWorker(): Promise<void> {
  const config = createApiConfig({
    templatesRoot: process.env.DOCFORM_TEMPLATES_ROOT,
    outputRoot: process.env.DOCFORM_OUTPUT_ROOT,
    apiKey: process.env.DOCFORM_API_KEY,
    logRequests: process.env.DOCFORM_LOG_REQUESTS === "true",
    jobsWorkerEnabled: true
  });
  const jobs = createGenerateJobStore(config);

  if (!jobs) {
    throw new Error("Async generation jobs are not configured.");
  }

  const worker = createGenerateJobWorker(jobs, config);
  worker.start();
  console.log(`DocForm worker listening for generation jobs with concurrency ${config.jobs.concurrency}`);

  const shutdown = async (): Promise<void> => {
    await worker.stop();
    await jobs.close?.();
  };

  process.once("SIGINT", () => {
    shutdown()
      .then(() => {
        process.exitCode = 0;
      })
      .catch((error: unknown) => {
        console.error(error);
        process.exitCode = 1;
      });
  });
  process.once("SIGTERM", () => {
    shutdown()
      .then(() => {
        process.exitCode = 0;
      })
      .catch((error: unknown) => {
        console.error(error);
        process.exitCode = 1;
      });
  });
}

const isMain = process.argv[1] ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;

if (isMain) {
  startGenerateWorker().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
