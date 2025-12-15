FROM node:24-slim

WORKDIR /srv

# Copy entire worker project and shared module into image to ensure all sources are present
COPY worker/ ./worker
COPY shared ./worker/src/shared

# Install dependencies inside worker directory
WORKDIR /srv/worker
RUN npm clean-install

COPY app/src/lib/locales/de.json /opt/labels/de.json

# Set the command to start the application
CMD ["npm", "start"]
