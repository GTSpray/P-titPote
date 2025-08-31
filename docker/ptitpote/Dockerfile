FROM node:24-slim
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY --chown=node:node src src
EXPOSE 3000
ENV HOST=0.0.0.0 PORT=3000
CMD ["node", "src/app.js"]