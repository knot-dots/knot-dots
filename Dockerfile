FROM node:18-slim
WORKDIR /srv/app
COPY package*.json .
RUN npm install
COPY .svelte-kit ./.svelte-kit
COPY svelte.config.js .
COPY tsconfig.json .
COPY vite.config.ts .
COPY src ./src
COPY static ./static
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
