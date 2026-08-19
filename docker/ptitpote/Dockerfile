FROM node:26-slim AS ptitpotebase
WORKDIR /app
RUN apt update && apt install -y wget tar jq python3 make g++
COPY docker/ptitpote/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
COPY package*.json ./

FROM ptitpotebase AS ptitpotebuilder
WORKDIR /app
ENV NODE_ENV=development
RUN npm ci
COPY . .
RUN npm run build

FROM ptitpotebase
WORKDIR /app
ENV NODE_ENV=production
COPY --from=ptitpotebuilder --chown=node:node /app/dist ./dist
RUN npm ci
USER node
ENTRYPOINT ["/entrypoint.sh"]
CMD ["both"]
