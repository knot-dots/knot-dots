FROM node:24-slim AS builder
WORKDIR /srv/knot-dots
COPY package*.json ./
COPY import/package.json ./import/
COPY shared/package.json ./shared/
RUN npm clean-install --silent --workspace import --workspace shared
COPY import/src ./import/src
COPY shared/src ./shared/src
COPY app/src/lib/locales/de.json /opt/labels/de.json
ENTRYPOINT ["npm", "run", "--workspace", "import"]
