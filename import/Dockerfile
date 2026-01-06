FROM node:24-slim AS builder
WORKDIR /srv/app
COPY import/package*.json ./
RUN npm clean-install --silent
COPY import/tsconfig.json .
COPY import/src ./src
COPY shared ./shared
COPY app/src/lib/locales/de.json /opt/labels/de.json
ENTRYPOINT ["npm", "run"]
