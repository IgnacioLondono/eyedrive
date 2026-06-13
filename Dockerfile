FROM node:20-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY web/package.json web/package-lock.json ./web/
RUN cd web && npm ci

COPY web ./web
RUN cd web && npm run build

COPY server.js ./
COPY lib ./lib
COPY backup ./backup

RUN mkdir -p /app/data/uploads

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server.js"]
