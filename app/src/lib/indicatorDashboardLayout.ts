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
export function columnSpanOf(width: Item['width'], columns: number) {
	if (columns >= 6) {
		return columnsByWidth[width];
	}
	if (columns >= 4) {
		return width === '2/6' || width === '3/6' ? 2 : 4;
	}
	return columns;
}

type Place = { items: number[]; height: number; span: number; stack: boolean };

// A place of a row: a card, or cards of the same width stacked below each other
type RowPlace = {
	column: number;
	columnSpan: number;
	height: number;
	items: number[];
	stack: boolean;
};

type Row = { height: number; last: number; places: RowPlace[]; top: number };

// Places the cards in rows in their order, without coordinates of their own: a card that does
// not fit into the row starts a new one, and nothing moves ahead, so the reading order stays the
// order of the items. A row is as high as its tallest card. Lower cards of the same width stack
// beside it. On fewer than six columns, the last card of a row fills the space left.
export function layout(items: Item[], columns: number): Placement[] {
	return arrange(items, columns).placements;
}

function arrange(items: Item[], columns: number) {
	const heightOf = (i: number) => rowsByHeight[items[i].height];
	const spanOf = (i: number) => columnSpanOf(items[i].width, columns);
	const placements: Placement[] = new Array(items.length);
	const rows: Row[] = [];

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
		const places = row.places.map((place, k) => {
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
			const placed = { ...place, column, columnSpan: spans[k] };
			column += spans[k];
			return placed;
		});
		rows.push({ height: rowHeight, last: row.end - 1, places, top });

		top += rowHeight;
		start = row.end;
	}

	return { placements, rows };
}

// A gap is below a stack or at the end of a row.
export type Gap = Placement & { anchor: number; at: 'below' | 'end' } & Item;

const heightFor = (rowSpan: number): Item['height'] =>
	rowSpan >= 4 ? '4/4' : rowSpan >= 2 ? '2/4' : '1/4';

// The width setting that takes the given number of columns
function widthFor(columnSpan: number, columns: number): Item['width'] {
	if (columns >= 6) {
		return columnSpan >= 6 ? '6/6' : columnSpan >= 4 ? '4/6' : columnSpan >= 3 ? '3/6' : '2/6';
	}
	return columnSpan >= 4 ? '6/6' : '3/6';
}

// The free places of the grid where a card can go: below a stack lower than its row, and at the
// end of a row with two columns or more left. A card dropped there takes the height and width
// of the gap and comes after the card before it, the anchor. On fewer than six columns, the last
// card of a row fills it, so only the gaps below stacks remain.
export function gapsOf(items: Item[], columns: number): Gap[] {
	const gaps: Gap[] = [];
	for (const row of arrange(items, columns).rows) {
		for (const place of row.places) {
			if (place.stack && place.height < row.height) {
				const anchor = place.items[place.items.length - 1];
				gaps.push({
					anchor,
					at: 'below',
					column: place.column,
					columnSpan: place.columnSpan,
					height: heightFor(row.height - place.height),
					row: row.top + place.height,
					rowSpan: row.height - place.height,
					width: items[anchor].width
				});
			}
		}
		const end = row.places.at(-1);
		const free = end ? columns + 1 - (end.column + end.columnSpan) : 0;
		if (free >= 2) {
			const width = widthFor(free, columns);
			gaps.push({
				anchor: row.last,
				at: 'end',
				column: columns + 1 - free,
				columnSpan: columnSpanOf(width, columns),
				height: heightFor(row.height),
				row: row.top,
				rowSpan: row.height,
				width
			});
		}
	}
	return gaps;
}

// Moves the card at `from` into the gap: it takes the height and width of the gap and comes after
// the anchor. A gap next to the card itself makes it grow by the gap, in height below it and in
// width at the end of its row. A width that looks the same at this number of columns, such as 2
// and 3 columns on four, stays as it was.
export function dropIntoGap<T extends Item>(items: T[], from: number, gap: Gap, columns: number) {
	const item = items[from];
	if (gap.anchor === from) {
		return items.with(
			from,
			gap.at === 'below'
				? { ...item, height: heightFor(gap.rowSpan + rowsByHeight[item.height]) }
				: { ...item, width: widthFor(columnSpanOf(item.width, columns) + gap.columnSpan, columns) }
		);
	}
	const width =
		columnSpanOf(gap.width, columns) === columnSpanOf(item.width, columns) ? item.width : gap.width;
	const moved = { ...item, height: gap.height, width };
	const rest = items.toSpliced(from, 1);
	const anchor = gap.anchor > from ? gap.anchor - 1 : gap.anchor;
	return rest.toSpliced(anchor + 1, 0, moved);
}
