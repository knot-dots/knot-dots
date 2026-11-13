import type { IndicatorDashboardItem } from '$lib/models';

type Item = Pick<IndicatorDashboardItem, 'height' | 'width'>;

// Where a card goes in the CSS grid, 1-based.
export type Placement = { column: number; columnSpan: number; row: number; rowSpan: number };

export const gridGap = 16;

const baseRowHeight = 84;

// Column width of six columns on 1076 px, the content width the design starts from
const referenceColumnWidth = 166;

const maxRowGrowth = 1.5;

export const rowsByHeight: Record<Item['height'], number> = { '1/4': 1, '2/4': 2, '4/4': 4 };

const columnsByWidth: Record<Item['width'], number> = { '2/6': 2, '3/6': 3, '4/6': 4, '6/6': 6 };

// The grid never has more than six columns, so a dashboard keeps its arrangement on large
// screens and only grows.
export function columnsFor(width: number) {
	return width >= 900 ? 6 : width >= 560 ? 4 : 2;
}

// Rows grow with the columns on large screens, so cards keep their proportions, up to 1.5 times.
export function rowHeightFor(width: number, columns: number) {
	if (columns < 6) {
		return baseRowHeight;
	}
	const columnWidth = (width - (columns - 1) * gridGap) / columns;
	const growth = Math.min(Math.max(columnWidth / referenceColumnWidth, 1), maxRowGrowth);
	return Math.round(baseRowHeight * growth);
}

// On four columns, widths 2/6 and 3/6 take half the row, 4/6 and 6/6 the whole row. On two columns
// every card takes the whole row.
function columnSpanOf(width: Item['width'], columns: number) {
	if (columns >= 6) {
		return columnsByWidth[width];
	}
	if (columns >= 4) {
		return width === '2/6' || width === '3/6' ? 2 : 4;
	}
	return columns;
}

type Place = { items: number[]; height: number; span: number; stack: boolean };

// Places the cards in rows in their order, without coordinates of their own: a card that does
// not fit into the row starts a new one, and nothing moves ahead, so the reading order stays the
// order of the items. A row is as high as its tallest card. Lower cards of the same width stack
// beside it. On fewer than six columns, the last card of a row fills the space left.
export function layout(items: Item[], columns: number): Placement[] {
	const heightOf = (i: number) => rowsByHeight[items[i].height];
	const spanOf = (i: number) => columnSpanOf(items[i].width, columns);
	const placements: Placement[] = new Array(items.length);

	function pack(start: number, rowHeight: number) {
		const places: Place[] = [];
		let used = 0;
		let end = start;
		while (end < items.length) {
			const height = heightOf(end);
			const span = spanOf(end);
			const full = span >= columns;
			const stack = full
				? undefined
				: places.find(
						(place) =>
							place.stack &&
							place.span === span &&
							height < rowHeight &&
							place.height + height <= rowHeight
					);
			if (stack) {
				stack.items.push(end);
				stack.height += height;
				end++;
				continue;
			}
			if ((used + span > columns || full) && places.length > 0) {
				break;
			}
			places.push({ items: [end], height, span, stack: height < rowHeight && !full });
			used += span;
			end++;
			if (full) {
				break;
			}
		}
		const tallest = Math.max(...places.flatMap(({ items }) => items.map(heightOf)));
		return { end, places, tallest };
	}

	let top = 1;
	let start = 0;
	while (start < items.length) {
		// The first height at which the row holds a card that high
		let rowHeight = 0;
		let row: ReturnType<typeof pack> | undefined;
		for (const candidate of [4, 2, 1]) {
			const tried = pack(start, candidate);
			if (tried.tallest === candidate) {
				rowHeight = candidate;
				row = tried;
				break;
			}
		}
		if (!row) {
			rowHeight = pack(start, heightOf(start)).tallest;
			row = pack(start, rowHeight);
		}

		const spans = row.places.map(({ span }) => span);
		const rest = columns - spans.reduce((sum, span) => sum + span, 0);
		if (columns < 6 && rest > 0) {
			spans[spans.length - 1] += rest;
		}

		let column = 1;
		row.places.forEach((place, k) => {
			let offset = 0;
			for (const i of place.items) {
				placements[i] = {
					column,
					columnSpan: spans[k],
					row: top + offset,
					rowSpan: heightOf(i)
				};
				offset += heightOf(i);
			}
			column += spans[k];
		});

		top += rowHeight;
		start = row.end;
	}

	return placements;
}
