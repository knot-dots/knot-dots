import { NodeSDK } from '@opentelemetry/sdk-node';
import { createAddHookMessageChannel } from 'import-in-the-middle';
import { register } from 'node:module';

register(
	'import-in-the-middle/hook.mjs',
	import.meta.url,
	createAddHookMessageChannel().registerOptions
);

const sdk = new NodeSDK();

sdk.start();
