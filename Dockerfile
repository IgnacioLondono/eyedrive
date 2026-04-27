FROM node:20-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY server.js ./
COPY public ./public

RUN mkdir -p /app/data/uploads

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server.js"]
