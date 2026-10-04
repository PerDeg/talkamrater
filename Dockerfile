# Talkamrater: spelet och API:t i en container

# Talsyntes: Piper med svenska röster laddas ner när avbildningen byggs.
#   lisa = kvinnlig röst (standard, även figurerna Plutt och Robot i spelet)
#   nst  = manlig röst ("Nils" i spelet)
# Bygg utan talsyntes med:  docker build --build-arg PIPER=0 .
FROM debian:bookworm-slim AS piper
ARG PIPER=1
ARG PIPER_VERSION=2023.11.14-2
ARG PIPER_VOICES="lisa nst"
ARG TARGETARCH
RUN mkdir -p /opt/piper/voices && if [ "$PIPER" = "1" ]; then \
      apt-get update && apt-get install -y --no-install-recommends ca-certificates curl && \
      arch=$([ "$TARGETARCH" = "arm64" ] && echo aarch64 || echo x86_64) && \
      curl -fsSL "https://github.com/rhasspy/piper/releases/download/${PIPER_VERSION}/piper_linux_${arch}.tar.gz" | tar xz -C /opt && \
      for v in $PIPER_VOICES; do \
        base="https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/sv/sv_SE/$v/medium/sv_SE-$v-medium.onnx" && \
        curl -fsSL -o "/opt/piper/voices/$v.onnx" "$base" && \
        curl -fsSL -o "/opt/piper/voices/$v.onnx.json" "$base.json" || exit 1; \
      done; \
    fi

FROM node:22-bookworm-slim

WORKDIR /app
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev && npm cache clean --force

COPY server/src ./server/src
COPY public ./public
COPY --from=piper /opt/piper /opt/piper

RUN mkdir -p /data && chown node:node /data
ENV NODE_ENV=production \
    PORT=3000 \
    DB_CLIENT=sqlite \
    SQLITE_FILE=/data/talkamrater.db
VOLUME /data
EXPOSE 3000
USER node

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/src/index.js"]
