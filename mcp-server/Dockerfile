FROM node:24-slim
WORKDIR /srv/knot-dots
COPY package*.json ./
COPY mcp-server/package.json ./mcp-server/
RUN npm clean-install --silent --workspace @knot-dots/mcp-server
COPY mcp-server/tsconfig.json ./mcp-server/
COPY mcp-server/src ./mcp-server/src
RUN npm run build --workspace @knot-dots/mcp-server
CMD ["npm", "start", "--workspace", "@knot-dots/mcp-server"]
