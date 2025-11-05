FROM node:20-alpine AS build

WORKDIR /app

COPY app/package*.json ./

RUN npm ci

COPY app/ ./

RUN npm run build || true

FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache curl

COPY --from=build /app ./

ENV NODE_ENV=production \
    PORT=3000 \
    VERSION="blue" \
    DEPLOYMENT_LABEL="Blue"

EXPOSE 3000

CMD ["npm", "start"]
