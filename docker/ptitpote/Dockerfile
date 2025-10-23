FROM node:24-slim AS ptitpotebuilder
WORKDIR /app
RUN apt update && apt install -y python3 make g++
COPY package*.json ./
RUN npm install
COPY --chown=node:node . /app
RUN npm run build
ENV NODE_ENV production
RUN npm ci

FROM node:24-slim AS ptitpoteprod
ENV NODE_ENV production
WORKDIR /app
COPY --from=ptitpotebuilder --chown=node:node  /app/package*.json /app/
COPY --from=ptitpotebuilder --chown=node:node  /app/dist /app/dist
COPY --from=ptitpotebuilder --chown=node:node  /app/node_modules /app/node_modules

FROM ptitpoteprod AS gateway
CMD ["npm","run","--silent","start:gateway"]

FROM ptitpoteprod AS api
CMD ["npm","run","--silent","start:api"]