# Talkamrater: spelet och API:t i en container
FROM node:22-bookworm-slim

WORKDIR /app
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev && npm cache clean --force

COPY server/src ./server/src
COPY public ./public

RUN mkdir -p /data && chown node:node /data
ENV NODE_ENV=production \
    PORT=3000 \
    DB_CLIENT=sqlite \
    SQLITE_FILE=/data/talkamrater.db
VOLUME /data
EXPOSE 3000
USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/src/index.js"]
