import { handler } from './build/handler.js';
import express from 'express';

const app = express();

// let SvelteKit handle everything else, including serving prerendered pages and static assets
app.use(handler);

const server = app.listen(3000, () => {
	console.log('listening on port 3000');
});

process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
