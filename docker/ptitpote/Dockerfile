FROM node:24-slim
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY --chown=node:node src src
CMD ["npm","run","--silent","start"]