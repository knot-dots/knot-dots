import { z } from 'zod';

const httpsURL = z
	.string()
	.trim()
	.pipe(z.url({ protocol: /^https$/ }));

// Normalize the comma-separated env value to exact HTTPS origins.
function allowedOrigins(value = '') {
	return new Set(
		value.split(',').flatMap((origin) => {
			const result = httpsURL.safeParse(origin);
			return result.success ? [new URL(result.data).origin] : [];
		})
	);
}

// Return the normalized iframe URL only when its origin is allowlisted.
export function igniteVideoURL(value = '', allowedOriginsValue = '') {
	const result = httpsURL.safeParse(value);
	if (!result.success) {
		return undefined;
	}

	return allowedOrigins(allowedOriginsValue).has(new URL(result.data).origin)
		? result.data
		: undefined;
}
