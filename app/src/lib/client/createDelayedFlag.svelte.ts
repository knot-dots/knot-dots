interface CreateDelayedFlagOptions {
	// Time the source has to stay true before the flag turns on
	delay?: number;
	// Time the flag stays on at least once it has turned on
	minDuration?: number;
}

export const LOADING_DELAY = 150;

export const LOADING_MIN_DURATION = 300;

// Follows a boolean source with a delay so that short loading phases do not
// flash an indicator, and keeps a visible indicator long enough to be noticed.
export default function createDelayedFlag(
	source: () => boolean,
	{ delay = LOADING_DELAY, minDuration = LOADING_MIN_DURATION }: CreateDelayedFlagOptions = {}
) {
	let current = $state(false);
	let shownAt = 0;

	$effect(() => {
		const active = source();
		let timeout: ReturnType<typeof setTimeout> | undefined;

		if (active && !current) {
			timeout = setTimeout(() => {
				current = true;
				shownAt = Date.now();
			}, delay);
		} else if (!active && current) {
			timeout = setTimeout(
				() => {
					current = false;
				},
				Math.max(0, minDuration - (Date.now() - shownAt))
			);
		}

		return () => clearTimeout(timeout);
	});

	return {
		get current() {
			return current;
		}
	};
}
