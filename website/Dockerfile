FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0 DATA_DIR=/app/data
COPY --chown=node:node server ./server
COPY --chown=node:node seed/questions.json ./seed/questions.json
COPY --chown=node:node dist/client ./dist/client
COPY --chown=node:node scripts/create-admin.mjs scripts/backup.mjs scripts/restore.mjs scripts/healthcheck.mjs ./scripts/
RUN mkdir -p /app/data && chown node:node /app/data
USER node
EXPOSE 3000
VOLUME ["/app/data"]
HEALTHCHECK --interval=30s --timeout=5s CMD node scripts/healthcheck.mjs
CMD ["node", "server/index.mjs"]
