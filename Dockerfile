FROM node:18-slim AS production
WORKDIR /srv/app
COPY package*.json .
RUN npm install
COPY svelte.config.js .
COPY tsconfig.json .
COPY vite.config.ts .
COPY src ./src
COPY static ./static
RUN npm run build
EXPOSE 3000
CMD ["node", "build"]

FROM production
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
