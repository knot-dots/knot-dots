FROM node:24-slim
WORKDIR /srv/knot-dots
COPY package*.json ./
COPY worker/package.json ./worker/
COPY shared/package.json ./shared/
RUN npm clean-install --silent --workspace shared --workspace worker
COPY worker/src ./worker
COPY shared ./shared
COPY app/src/lib/locales/de.json /opt/labels/de.json
CMD ["npm", "start", "--workspace", "worker"]
