FROM node:24-slim AS builder
WORKDIR /srv/app
COPY package*.json ./
RUN npm clean-install --silent
COPY tsconfig.json .
COPY src ./src
ENTRYPOINT ["npm", "run"]
