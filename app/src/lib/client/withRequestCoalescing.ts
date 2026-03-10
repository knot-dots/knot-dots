const inflight = new Map<string, Promise<Response>>();

export default function withRequestCoalescing(
	fn: (url: string | URL, init?: RequestInit) => Promise<Response>
) {
	return async (url: string | URL, init?: RequestInit) => {
		if (inflight.has(String(url))) {
			return inflight.get(String(url))!;
		}

		inflight.set(String(url), fn(url, init));

		try {
			// await ensures the promise is resolved before it is removed from the map
			return await inflight.get(String(url))!;
		} finally {
			inflight.delete(String(url));
		}
	};
}
