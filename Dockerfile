FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

FROM node:18-alpine

WORKDIR /app

COPY --from=build /app/dist ./dist
COPY --from=build /app/production-server.js ./production-server.js
COPY --from=build /app/auth.prod.js ./auth.js
COPY --from=build /app/package*.json ./

RUN npm ci --only=production

# Create data directory with appropriate permissions
RUN mkdir -p /app/data && chmod 777 /app/data

ENV NODE_ENV=production
ENV PORT=5000
ENV DATA_FILE_PATH=/app/data/data.json

EXPOSE 5000

CMD ["node", "production-server.js"]