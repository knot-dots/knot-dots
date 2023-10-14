import { env } from '$env/dynamic/public';

export function accountURL(referrer_uri: string) {
	const url = new URL(`${env.PUBLIC_KC_URL}/realms/${env.PUBLIC_KC_REALM}/account`);
	url.searchParams.set('referrer', env.PUBLIC_KC_CLIENT_ID ?? '');
	url.searchParams.set('referrer_uri', referrer_uri);
	return url.toString();
}
