FROM mcr.microsoft.com/playwright:v1.59.1-noble AS build

WORKDIR /app

ENV CI=true
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json vitest.config.ts ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install --frozen-lockfile
RUN pnpm build
RUN pnpm prune --prod

FROM mcr.microsoft.com/playwright:v1.59.1-noble

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DOCFORM_OUTPUT_ROOT=/data/docform/output
ENV DOCFORM_LOG_REQUESTS=true
ENV DOCFORM_JOBS_WORKER_ENABLED=false
ENV DOCFORM_JOB_CONCURRENCY=1

COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps ./apps
COPY --from=build /app/packages ./packages

EXPOSE 3000

CMD ["node", "apps/api/dist/index.js"]
