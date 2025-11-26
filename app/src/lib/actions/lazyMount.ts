// Lazily mount heavy components when their container becomes visible.
// Uses IntersectionObserver to call `onVisible` and optionally unobserve thereafter.
// Example:
// <div use:lazyMount={{ onVisible: () => (mounted = true), once: true, rootMargin: '100px' }}>
//   {#if mounted}<HeavyComponent />{:else}<Placeholder />{/if}
// </div>

export type LazyMountParams = {
	onVisible: () => void;
	once?: boolean; // unobserve after first visibility
	root?: Element | null;
	rootMargin?: string;
	threshold?: number | number[];
};

export default function lazyMount(node: HTMLElement, params?: LazyMountParams) {
	let observer: IntersectionObserver | null = null;
	let current = params;

	function cleanup() {
		if (observer) {
			observer.disconnect();
			observer = null;
		}
	}

	function setup() {
		cleanup();
		if (!current || typeof current.onVisible !== 'function') return;
		// SSR/older browsers: if IntersectionObserver is unavailable, call onVisible immediately.
		if (typeof (globalThis as any).IntersectionObserver === 'undefined') {
			current.onVisible();
			return;
		}
		observer = new IntersectionObserver(
			(entries) => {
				// snapshot params to avoid race with update()
				const cfg = current;
				for (const entry of entries) {
					if (!cfg) break;
					if (entry.isIntersecting) {
						try {
							cfg.onVisible?.();
						} finally {
							if (cfg.once) cleanup();
						}
						break;
					}
				}
			},
			{
				root: current.root ?? null,
				rootMargin: current.rootMargin ?? '0px',
				threshold: current.threshold ?? 0
			}
		);
		observer.observe(node);
	}

	setup();

	return {
		update(next?: LazyMountParams) {
			current = next;
			setup();
		},
		destroy() {
			cleanup();
		}
	};
}
