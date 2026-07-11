FROM node:22-alpine AS production

ENV NODE_ENV=production
WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --ignore-scripts && npm cache clean --force

COPY --chown=node:node src ./src

USER node
EXPOSE 5002

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O - "http://127.0.0.1:${PORT:-5002}/health" > /dev/null || exit 1

CMD ["node", "src/server.js"]
