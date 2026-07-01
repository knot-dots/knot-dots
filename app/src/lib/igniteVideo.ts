import { z } from 'zod';

const igniteVideoHostname = /^play\.ignite\.video$/;

const httpsURL = z
	.string()
	.trim()
	.pipe(z.url({ protocol: /^https$/, hostname: igniteVideoHostname }));

export function igniteVideoURL(value = '') {
	const result = httpsURL.safeParse(value);
	if (!result.success) {
		return undefined;
	}

	return result.data;
}
