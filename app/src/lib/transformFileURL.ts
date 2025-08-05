import { env } from '$env/dynamic/public';

function parse(url: string) {
	return new URL(url);
}

export default function transformFileURL(originURL: string) {
	const fileURL = new URL(parse(originURL).pathname, env.PUBLIC_CDN_URL);
	return fileURL.toString();
}
