FROM node:26-slim AS ptitpotebase
WORKDIR /app
RUN apt update && apt install -y python3 make g++
COPY package*.json ./

FROM ptitpotebase AS ptitpotebuilder
ENV NODE_ENV development
RUN npm ci
COPY --chown=node:node . /app
RUN npm run build

FROM ptitpotebase AS ptitpoteprod-deps
ENV NODE_ENV production
RUN npm ci --omit=dev

FROM node:26-slim AS ptitpoteprod
ENV NODE_ENV production
WORKDIR /app
RUN npm config set update-notifier false
COPY docker/ptitpote/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
COPY package*.json ./
COPY --from=ptitpoteprod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=ptitpotebuilder --chown=node:node /app/dist ./dist
USER node
ENTRYPOINT ["/entrypoint.sh"]
CMD ["api"]

FROM ptitpoteprod AS ptitpote

FROM ptitpoteprod AS api
CMD ["api"]

FROM ptitpoteprod AS gateway
CMD ["gateway"]
