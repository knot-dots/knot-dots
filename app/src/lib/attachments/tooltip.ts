import {
	arrow,
	autoUpdate,
	computePosition,
	flip,
	offset,
	shift,
	type Placement
} from '@floating-ui/dom';
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
			shiftPadding: 0,
			target: 'body',
			visibility: true,
			...options
		};

		let cleanUpPosition: VoidFunction | null = null;

		let Tooltip: HTMLElement | null = null;
		let TooltipContent: HTMLElement | null = null;
		let TooltipArrow: HTMLElement | null = null;

		const targetElement =
			typeof config.target === 'string' ? document.querySelector(config.target) : config.target;

		const uid = `tooltip-${id}`;

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

		const showTooltip = async () => {
			if (Tooltip && config.visibility) {
				Tooltip.style.visibility = 'visible';

				cleanUpPosition = autoUpdate(node, Tooltip, () => {
					if (!Tooltip || !TooltipArrow) {
						return;
					}

					computePosition(node, Tooltip, {
						placement: config.placement,
						middleware: [
							offset(config.offset),
							flip(),
							shift({ padding: config.shiftPadding }),
							arrow({ element: TooltipArrow! })
						]
					}).then(({ x, y, placement, middlewareData }) => {
						if (!Tooltip || !TooltipArrow) {
							return;
						}

						Tooltip.style.left = `${x}px`;
						Tooltip.style.top = `${y}px`;

						const { x: arrowX, y: arrowY } = middlewareData.arrow!;
						const arrowSize = (TooltipArrow.getBoundingClientRect().width / 3).toFixed();

						const side = {
							top: 'bottom',
							right: 'left',
							bottom: 'top',
							left: 'right'
						}[placement.split('-')[0]]!;

						Object.assign(TooltipArrow.style, {
							left: arrowX != null ? `${arrowX}px` : '',
							top: arrowY != null ? `${arrowY}px` : '',
							right: '',
							bottom: '',
							[side]: `-${arrowSize}px`
						});
					});
				});
			}
		};

		const hideTooltip = () => {
			if (Tooltip) {
				Tooltip.style.visibility = 'hidden';
			}
		};

		const removeTooltip = () => {
			cleanUpPosition?.();

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
