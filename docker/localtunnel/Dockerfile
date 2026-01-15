FROM node:25-slim
RUN npm install -g localtunnel
CMD ["sh", "-c", "node /usr/local/bin/lt --local-host api --port ${APP_PORT} --subdomain ${LOCALTUNNEL_SUBDOMAIN}"]