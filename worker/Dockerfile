FROM node:24-slim

WORKDIR /srv

# Copy entire worker project and shared module into image to ensure all sources are present
COPY worker/ ./worker
COPY shared ./worker/src/shared

# Install dependencies inside worker directory
WORKDIR /srv/worker
RUN npm clean-install

# Set the command to start the application
CMD ["npm", "start"]
