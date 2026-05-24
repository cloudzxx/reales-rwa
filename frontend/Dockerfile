FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN mkdir -p lib
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]
