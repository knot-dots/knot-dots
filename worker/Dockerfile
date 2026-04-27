FROM node:24-slim
WORKDIR /srv/knot-dots
COPY package*.json ./
COPY app/package.json ./app
COPY shared/package.json ./shared/
COPY worker/package.json ./worker/
RUN npm clean-install --silent --workspace app --workspace shared --workspace worker
COPY app/src ./app/src
COPY shared/src ./shared/src
COPY worker/src ./worker/src
COPY app/src/lib/locales/de.json /opt/labels/de.json
CMD ["npm", "start", "--workspace", "worker"]
