FROM node:18-slim AS production
WORKDIR /srv/app
COPY package*.json ./
RUN npm install
COPY postcss.config.js .
COPY svelte.config.js .
COPY tsconfig.json .
COPY vite.config.ts .
COPY src ./src
COPY static ./static
RUN npm run check
RUN npm run build
EXPOSE 3000
CMD ["node", "build"]

FROM production AS dev
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

FROM production AS qa
RUN npx playwright install --with-deps
VOLUME /srv/app/test-results
ENV CI=""
COPY playwright.config.ts .
COPY tests ./tests
CMD ["npx", "playwright", "test"]
