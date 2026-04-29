import path from "node:path";

export type ApiServerOptions = {
  cwd?: string;
  templatesRoot?: string;
  outputRoot?: string;
};

export type ApiConfig = {
  cwd: string;
  templatesRoot: string;
  outputRoot: string;
};

export function createApiConfig(options: ApiServerOptions = {}): ApiConfig {
  const cwd = options.cwd ?? process.env.INIT_CWD ?? process.cwd();

  return {
    cwd,
    templatesRoot: path.resolve(cwd, options.templatesRoot ?? "packages/templates-basic/templates"),
    outputRoot: path.resolve(cwd, options.outputRoot ?? "output")
  };
}
