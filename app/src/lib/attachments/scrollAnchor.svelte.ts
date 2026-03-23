import { tick } from 'svelte';
import type { Attachment } from 'svelte/attachments';

export function createScrollAnchor(): {
	attachment: Attachment<HTMLElement>;
	captureForEnter: () => void;
	captureForLeave: () => void;
	onEditableChange: (previous: boolean | undefined, current: boolean | undefined) => void;
} {
	let scrollContainer: HTMLElement | null = null;
	let enterAnchor: ScrollAnchor | null = null;
	let hadInlineHelpBeforeLeave = false;

	const attachment: Attachment<HTMLElement> = (el) => {
		scrollContainer = el;
		return () => {
			scrollContainer = null;
		};
	};

	function captureForEnter() {
		if (scrollContainer) {
			enterAnchor = captureAnchor(scrollContainer);
		}
	}

	function captureForLeave() {
		if (!scrollContainer) {
			hadInlineHelpBeforeLeave = false;
			return;
		}

		hadInlineHelpBeforeLeave =
			scrollContainer.querySelector('.details-section[data-inline-help]') !== null;
	}

	function onEditableChange(previous: boolean | undefined, current: boolean | undefined) {
		if (!scrollContainer) return;
		const container = scrollContainer;

		if (current === true && previous !== true) {
			// ENTERING edit mode – restore the pre-captured position so the view
			// does not jump as editors and inline-help sections appear.
			const anchor = enterAnchor;
			enterAnchor = null;
			tick().then(() => {
				requestAnimationFrame(() => {
					restoreAnchor(container, anchor);
				});
			});
		} else if (current === false && previous === true) {
			if (!hadInlineHelpBeforeLeave) {
				return;
			}

			// LEAVING edit mode – DOM already updated, inline-help sections gone.
			// Find the topmost visible non-inline-help section and snap to top.
			tick().then(() => {
				requestAnimationFrame(() => {
					const anchor = captureAnchor(container);
					if (anchor) {
						restoreAnchor(container, { ...anchor, offsetFromViewport: 0 });
					}
				});
			});

			hadInlineHelpBeforeLeave = false;
		}
	}

	return { attachment, captureForEnter, captureForLeave, onEditableChange };
}

interface ScrollAnchor {
	guid: string;
	offsetFromViewport: number;
}

/**
 * Find the topmost `.details-section[data-guid]` (non-inline-help) whose bottom edge
 * is still below the scroll container's top edge, i.e. not completely scrolled past.
 * This is the section the user perceives as being "at the top" of the view.
 */
function captureAnchor(scrollContainer: HTMLElement): ScrollAnchor | null {
	const sections = scrollContainer.querySelectorAll<HTMLElement>(
		'.details-section[data-guid]:not([data-inline-help])'
	);

	if (sections.length === 0) {
		return null;
	}

	const containerRect = scrollContainer.getBoundingClientRect();

	let anchorSection: HTMLElement | null = null;
	for (const section of sections) {
		const sectionRect = section.getBoundingClientRect();
		// First section whose bottom is still below the container top = topmost
		// partially-visible section (hasn't been completely scrolled past yet).
		if (sectionRect.bottom > containerRect.top) {
			anchorSection = section;
			break;
		}
	}

	// Fallback: all sections are above the viewport – take the last one.
	if (!anchorSection) {
		anchorSection = sections[sections.length - 1];
	}

	const guid = anchorSection.dataset.guid;
	if (!guid) {
		return null;
	}

	const offsetFromViewport = anchorSection.getBoundingClientRect().top - containerRect.top;
	return { guid, offsetFromViewport };
}

/**
 * Adjust scrollTop so the anchor element ends up at the given viewport offset
 * inside the scroll container.
 */
function restoreAnchor(scrollContainer: HTMLElement, anchor: ScrollAnchor | null): void {
	if (!anchor) {
		return;
	}

	const element = scrollContainer.querySelector<HTMLElement>(
		`.details-section[data-guid="${CSS.escape(anchor.guid)}"]`
	);

	if (!element) {
		return;
	}

	const containerRect = scrollContainer.getBoundingClientRect();
	const elementRect = element.getBoundingClientRect();
	const currentOffset = elementRect.top - containerRect.top;
	const delta = currentOffset - anchor.offsetFromViewport;

	if (Math.abs(delta) > 1) {
		scrollContainer.scrollTop += delta;
	}
}
