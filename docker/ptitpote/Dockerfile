FROM node:24-slim AS ptitpotebuilder
WORKDIR /app
RUN apt update && apt install -y python3 make g++
COPY package*.json ./
RUN npm install
COPY --chown=node:node . /app
RUN npm run build

FROM node:24-slim AS ptitpoteprod
ENV NODE_ENV production
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY --from=ptitpotebuilder --chown=node:node  /app/dist /app/dist
CMD ["npm","run","--silent","start"]