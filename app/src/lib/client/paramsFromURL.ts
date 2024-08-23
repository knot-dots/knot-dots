export default function paramsFromURL(url: URL) {
	return url.hash
		? new URLSearchParams(url.hash.substring(1))
		: new URLSearchParams(url.searchParams);
}
