# ---- build (all workspaces) ----
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/web/package.json packages/web/
COPY packages/mcp/package.json packages/mcp/
RUN npm ci
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY packages/server packages/server
COPY packages/web packages/web
COPY packages/mcp packages/mcp
RUN npm run build --workspace=packages/shared \
 && npm run build --workspace=packages/server \
 && npm run build --workspace=packages/web \
 && npm run build --workspace=packages/mcp

# ---- app production deps ----
FROM node:20-bookworm-slim AS proddeps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
RUN npm ci --omit=dev --workspace=packages/server

# ---- app runtime (serves SPA + /api) ----
FROM node:20-bookworm-slim AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=proddeps /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/dist ./node_modules/@flashkarte/shared/dist
COPY --from=build /app/packages/shared/package.json ./node_modules/@flashkarte/shared/package.json
COPY --from=build /app/packages/server/dist ./packages/server/dist
COPY --from=build /app/packages/web/dist ./packages/server/public
WORKDIR /app/packages/server
EXPOSE 3001
CMD ["node", "dist/server.js"]

# ---- mcp production deps ----
FROM node:20-bookworm-slim AS mcpdeps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/mcp/package.json packages/mcp/
RUN npm ci --omit=dev --workspace=packages/mcp

# ---- mcp runtime (hosted MCP server) ----
FROM node:20-bookworm-slim AS mcp
WORKDIR /app
ENV NODE_ENV=production
COPY --from=mcpdeps /app/node_modules ./node_modules
COPY --from=build /app/packages/mcp/dist ./packages/mcp/dist
WORKDIR /app/packages/mcp
EXPOSE 3002
CMD ["node", "dist/index.js"]
