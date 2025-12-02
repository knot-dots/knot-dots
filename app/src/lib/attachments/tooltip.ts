import { createPopper, type Placement } from '@popperjs/core';
import type { Attachment } from 'svelte/attachments';

let id = 0;

interface Options {
	offset?: number;
	placement?: Placement;
	shiftPadding?: number;
	target?: string | HTMLElement;
	visibility?: boolean;
}

export default function tooltip(content: string, options?: Options): Attachment {
	return (node) => {
		let config = {
			placement: 'top' as Placement,
			offset: 8,
			shiftPadding: 10, // minimum distance from viewport edges
			target: 'body',
			visibility: true,
			...options
		};

		let popperInstance: ReturnType<typeof createPopper> | null = null;

		let Tooltip: HTMLElement | null = null;
		let TooltipContent: HTMLElement | null = null;
		let TooltipArrow: HTMLElement | null = null;

		// Inject minimal styles once
		if (!document.getElementById('app-tooltip-styles')) {
			const style = document.createElement('style');
			style.id = 'app-tooltip-styles';
			style.textContent = `
				.tooltip {
					position: absolute;
					background: var(--color-gray-800, #2d2d2d);
					color: #fff;
					border-radius: 4px;
					padding: 0.25rem 0.5rem;
					font-size: 0.75rem;
					line-height: 1.2;
					box-shadow: 0 2px 4px rgba(0,0,0,0.25);
					visibility: hidden;
					opacity: 0;
					transition: opacity 120ms ease;
					z-index: 1000;
					pointer-events: none;
				}
				.tooltip[data-show] { opacity: 1; }
				.tooltip-arrow { position: absolute; width: 8px; height: 8px; pointer-events: none; }
				.tooltip-arrow::before {
					content: '';
					position: absolute;
					width: 8px;
					height: 8px;
					background: var(--color-gray-800, #2d2d2d);
					transform: rotate(45deg);
					left: 0; top: 0;
				}
				.tooltip[data-popper-placement^='top'] > .tooltip-arrow { bottom: -4px; }
				.tooltip[data-popper-placement^='bottom'] > .tooltip-arrow { top: -4px; }
				.tooltip[data-popper-placement^='left'] > .tooltip-arrow { right: -4px; }
				.tooltip[data-popper-placement^='right'] > .tooltip-arrow { left: -4px; }
				`;
			document.head.appendChild(style);
		}

		const targetElement =
			typeof config.target === 'string' ? document.querySelector(config.target) : config.target;

		const uid = `tooltip-${id}`;
		id++;

		if (node.hasAttribute('title')) {
			node.removeAttribute('title');
		}

		const handleKeys = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				hideTooltip();
			}
		};

		const createTooltip = () => {
			if (Tooltip) {
				return;
			}

			Tooltip = document.createElement('div');
			Tooltip.setAttribute('id', uid);
			Tooltip.setAttribute('role', 'tooltip');
			Tooltip.setAttribute('class', 'tooltip');

			TooltipContent = document.createElement('span');
			TooltipContent.setAttribute('class', 'tooltip-content');
			TooltipContent.textContent = content;

			TooltipArrow = document.createElement('div');
			TooltipArrow.setAttribute('class', 'tooltip-arrow');
			TooltipArrow.setAttribute('data-popper-arrow', '');

			Tooltip.append(TooltipArrow);
			Tooltip.append(TooltipContent);

			if (!targetElement) {
				document.body.append(Tooltip);
			} else {
				targetElement.append(Tooltip);
			}
		};

		createTooltip();

		node.setAttribute('aria-labelledby', uid);

		if (!Tooltip) {
			throw new Error('tooltip has not been created.');
		}

		const showTooltip = () => {
			if (!Tooltip || !config.visibility) return;
			Tooltip.style.visibility = 'visible';
			Tooltip.setAttribute('data-show', '');
			// Initialize Popper instance if not yet created
			if (!popperInstance) {
				popperInstance = createPopper(node, Tooltip, {
					placement: config.placement,
					strategy: 'absolute',
					modifiers: [
						{ name: 'offset', options: { offset: [0, config.offset] } },
						{ name: 'flip', options: { padding: config.shiftPadding } },
						{ name: 'preventOverflow', options: { padding: config.shiftPadding, altAxis: true } },
						{ name: 'arrow', options: { element: TooltipArrow } },
						{ name: 'applyStyles', enabled: true }
					]
				});
			} else {
				popperInstance.update();
			}
		};

		const hideTooltip = () => {
			if (Tooltip) {
				Tooltip.style.visibility = 'hidden';
				Tooltip.removeAttribute('data-show');
				// Clear transform when hiding
				Tooltip.style.transform = '';
			}
		};

		const removeTooltip = () => {
			if (popperInstance) {
				popperInstance.destroy();
				popperInstance = null;
			}

			if (Tooltip) {
				Tooltip.remove();
				Tooltip = null;
			}

			window.removeEventListener('keydown', handleKeys);
		};

		node.addEventListener('mouseenter', showTooltip);
		node.addEventListener('mouseleave', hideTooltip);
		node.addEventListener('focus', showTooltip);
		node.addEventListener('blur', hideTooltip);

		window.addEventListener('keydown', handleKeys);

		return removeTooltip;
	};
}
