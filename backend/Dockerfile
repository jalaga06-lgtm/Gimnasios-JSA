FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate && npm run build
EXPOSE 3000
CMD ["sh", "-c", "until npx prisma db push; do echo 'Esperando a PostgreSQL...'; sleep 3; done; node dist/main.js"]
