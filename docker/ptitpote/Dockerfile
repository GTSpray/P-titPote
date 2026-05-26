FROM node:26-slim AS ptitpotebase
WORKDIR /app
RUN apt update && apt install -y wget tar jq python3 make g++
COPY package*.json ./

FROM ptitpotebase AS ptitpotedownloader
ENV NODE_ENV production
RUN wget -qO- https://github.com/GTSpray/P-titPote/releases/download/v$(cat ./package.json | jq .version -r)/ptitpote.tar.gz | gunzip | tar xvf -
RUN npm ci

FROM node:26-slim AS ptitpoteprod
ENV NODE_ENV production
WORKDIR /app
RUN npm config set update-notifier false
COPY --from=ptitpotedownloader --chown=node:node  /app /app

FROM ptitpoteprod AS gateway
CMD ["npm","run","--silent","start:gateway"]

FROM ptitpoteprod AS api
CMD ["npm","run","--silent","start:api"]

FROM ptitpotebase AS ptitpotebuilder
ENV NODE_ENV development
RUN npm ci
COPY --chown=node:node . /app
RUN npm run build