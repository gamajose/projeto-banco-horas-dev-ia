FROM node:20-bookworm-slim AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY postcss.config.js tailwind.config.js ./
COPY src/input.css ./src/input.css
COPY views ./views
COPY public ./public
RUN npm run build

FROM node:20-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY public ./public
COPY --from=build /app/public/css/output.css ./public/css/output.css
COPY scripts ./scripts
COPY src ./src
COPY views ./views
COPY migrations.js create-admin-profile.js schema.sql ./

EXPOSE 8000
USER node
CMD ["node", "src/app.js"]
