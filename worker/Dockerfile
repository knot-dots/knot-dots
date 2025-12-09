FROM node:24-slim

WORKDIR /srv/worker

COPY package*.json ./
RUN npm clean-install --silent

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

CMD ["npm", "start"]
