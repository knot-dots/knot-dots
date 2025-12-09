FROM node:24-slim

WORKDIR /srv

# Copy entire worker project and shared module into image to ensure all sources are present
COPY worker/ ./worker
COPY shared ./worker/src/shared

# Install dependencies inside worker directory
WORKDIR /srv/worker
RUN npm clean-install --silent

# Build worker (now that shared is present in the image)
RUN npm run build

# Build on container start as a safeguard, then start
CMD ["sh", "-lc", "npm run build && npm start"]
