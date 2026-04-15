FROM node:24-slim AS builder
WORKDIR /srv/knot-dots
COPY package*.json ./
COPY import/package.json ./import/
COPY shared/package.json ./shared/
RUN npm clean-install --silent --workspace import --workspace shared
COPY import/src ./import/src
COPY shared/src ./shared/src
COPY app/src/lib/locales/de.json /opt/labels/de.json
COPY import/bbsr.csv ./
COPY import/difu.xlsx ./
ENV BBSR_FILE=/srv/knot-dots/bbsr.csv
ENV DIFU_FILE=/srv/knot-dots/difu.xlsx
ENTRYPOINT ["npm", "run", "--workspace", "import"]
