import { describe, expect, test } from 'vitest';
import {
	columnsFor,
	dropIntoGap,
	type Gap,
	gapsOf,
	layout,
	type Placement,
	rowHeightFor,
	widthSteps
} from '$lib/indicatorDashboardLayout';

// Cards and placements in the notation of the spec: height/width, and row, columns from–to and
// height in rows. The spec writes the heights 1/4, 2/4 and 4/4 as s, m and l, and the widths
// 2/6, 3/6, 4/6 and 6/6 as 2, 3, 4 and full.
const heightOf = { s: '1/4', m: '2/4', l: '4/4' } as const;

const widthOf = { '2': '2/6', '3': '3/6', '4': '4/6', full: '6/6' } as const;

function cards(notation: string) {
	return notation.split(' ').map((card) => {
		const [height, width] = card.split('/') as [keyof typeof heightOf, keyof typeof widthOf];
		return { height: heightOf[height], width: widthOf[width] };
	});
}

function notation(placements: Placement[]) {
	return placements
		.map(
			({ column, columnSpan, row, rowSpan }, i) =>
				`${'ABCDE'[i]} Z${row} S${column}-${column + columnSpan - 1} H${rowSpan}`
		)
		.join(' · ');
}

describe.each([
	[
		'T1',
		'l/2 l/2 l/2',
		'A Z1 S1-2 H4 · B Z1 S3-4 H4 · C Z1 S5-6 H4',
		'A Z1 S1-2 H4 · B Z1 S3-4 H4 · C Z5 S1-4 H4',
		'A Z1 S1-2 H4 · B Z5 S1-2 H4 · C Z9 S1-2 H4'
	],
	[
		'T2',
		'l/3 l/3',
		'A Z1 S1-3 H4 · B Z1 S4-6 H4',
		'A Z1 S1-2 H4 · B Z1 S3-4 H4',
		'A Z1 S1-2 H4 · B Z5 S1-2 H4'
	],
	[
		'T3',
		'l/4 l/2',
		'A Z1 S1-4 H4 · B Z1 S5-6 H4',
		'A Z1 S1-4 H4 · B Z5 S1-4 H4',
		'A Z1 S1-2 H4 · B Z5 S1-2 H4'
	],
	[
		'T4',
		'l/full l/2',
		'A Z1 S1-6 H4 · B Z5 S1-2 H4',
		'A Z1 S1-4 H4 · B Z5 S1-4 H4',
		'A Z1 S1-2 H4 · B Z5 S1-2 H4'
	],
	[
		'T5',
		'l/2 l/3 l/2',
		'A Z1 S1-2 H4 · B Z1 S3-5 H4 · C Z5 S1-2 H4',
		'A Z1 S1-2 H4 · B Z1 S3-4 H4 · C Z5 S1-4 H4',
		'A Z1 S1-2 H4 · B Z5 S1-2 H4 · C Z9 S1-2 H4'
	],
	[
		'T6',
		'l/4 s/2 s/2 s/2 s/2',
		'A Z1 S1-4 H4 · B Z1 S5-6 H1 · C Z2 S5-6 H1 · D Z3 S5-6 H1 · E Z4 S5-6 H1',
		'A Z1 S1-4 H4 · B Z5 S1-2 H1 · C Z5 S3-4 H1 · D Z6 S1-2 H1 · E Z6 S3-4 H1',
		'A Z1 S1-2 H4 · B Z5 S1-2 H1 · C Z6 S1-2 H1 · D Z7 S1-2 H1 · E Z8 S1-2 H1'
	],
	[
		'T7',
		'l/4 m/2 s/2 s/2',
		'A Z1 S1-4 H4 · B Z1 S5-6 H2 · C Z3 S5-6 H1 · D Z4 S5-6 H1',
		'A Z1 S1-4 H4 · B Z5 S1-2 H2 · C Z5 S3-4 H1 · D Z6 S3-4 H1',
		'A Z1 S1-2 H4 · B Z5 S1-2 H2 · C Z7 S1-2 H1 · D Z8 S1-2 H1'
	],
	[
		'T8',
		'l/4 m/3',
		'A Z1 S1-4 H4 · B Z5 S1-3 H2',
		'A Z1 S1-4 H4 · B Z5 S1-4 H2',
		'A Z1 S1-2 H4 · B Z5 S1-2 H2'
	],
	[
		'T9',
		'm/2 m/2 m/2',
		'A Z1 S1-2 H2 · B Z1 S3-4 H2 · C Z1 S5-6 H2',
		'A Z1 S1-2 H2 · B Z1 S3-4 H2 · C Z3 S1-4 H2',
		'A Z1 S1-2 H2 · B Z3 S1-2 H2 · C Z5 S1-2 H2'
	],
	[
		'T10',
		's/2 l/4 s/2',
		'A Z1 S1-2 H1 · B Z1 S3-6 H4 · C Z2 S1-2 H1',
		'A Z1 S1-4 H1 · B Z2 S1-4 H4 · C Z6 S1-4 H1',
		'A Z1 S1-2 H1 · B Z2 S1-2 H4 · C Z6 S1-2 H1'
	],
	[
		'T11',
		'l/2 l/2',
		'A Z1 S1-2 H4 · B Z1 S3-4 H4',
		'A Z1 S1-2 H4 · B Z1 S3-4 H4',
		'A Z1 S1-2 H4 · B Z5 S1-2 H4'
	],
	[
		'T12',
		'l/4 s/2',
		'A Z1 S1-4 H4 · B Z1 S5-6 H1',
		'A Z1 S1-4 H4 · B Z5 S1-4 H1',
		'A Z1 S1-2 H4 · B Z5 S1-2 H1'
	]
])('%s: %s', (_, items, onSix, onFour, onTwo) => {
	test('on six columns', () => {
		expect(notation(layout(cards(items), 6))).toBe(onSix);
	});

	test('on four columns', () => {
		expect(notation(layout(cards(items), 4))).toBe(onFour);
	});

	test('on two columns', () => {
		expect(notation(layout(cards(items), 2))).toBe(onTwo);
	});
});

test('an empty dashboard has no placements', () => {
	expect(layout([], 6)).toEqual([]);
});

test('a single card starts at the top left', () => {
	expect(notation(layout(cards('m/3'), 6))).toBe('A Z1 S1-3 H2');
});

test.each([
	[559, 2],
	[560, 4],
	[899, 4],
	[900, 6]
])('a content width of %i px has %i columns', (width, columns) => {
	expect(columnsFor(width)).toBe(columns);
});

test.each([
	[1076, 6, 84],
	[1920, 6, 126],
	[1400, 6, 111],
	[800, 4, 84]
])('on %i px and %i columns, rows are %i px high', (width, columns, height) => {
	expect(rowHeightFor(width, columns)).toBe(height);
});

// The notation of a value in one of the tables above
const noted = (table: Record<string, string>, value: string) =>
	Object.keys(table).find((key) => table[key] === value);

// Gaps in the notation of the spec, with the card they come after and the size a card takes there
function gapNotation(gaps: Gap[]) {
	return gaps
		.map(
			({ anchor, column, columnSpan, height, row, rowSpan, width }) =>
				`Z${row} S${column}-${column + columnSpan - 1} H${rowSpan} after ${'ABCDE'[anchor]} ${noted(heightOf, height)}/${noted(widthOf, width)}`
		)
		.join(' · ');
}

test.each([
	['T4', 'l/full l/2', 'Z5 S3-6 H4 after B l/4'],
	['T5', 'l/2 l/3 l/2', 'Z5 S3-6 H4 after C l/4'],
	['T8', 'l/4 m/3', 'Z1 S5-6 H4 after A l/2 · Z5 S4-6 H2 after B m/3'],
	['T10', 's/2 l/4 s/2', 'Z3 S1-2 H2 after C m/2'],
	['T11', 'l/2 l/2', 'Z1 S5-6 H4 after B l/2'],
	['T12', 'l/4 s/2', 'Z2 S5-6 H3 after B m/2']
])('%s on six columns has the gaps %s', (_, items, expected) => {
	expect(gapNotation(gapsOf(cards(items), 6))).toBe(expected);
});

test('on four columns, the last card of a row fills its end, but a gap below a stack remains', () => {
	expect(gapNotation(gapsOf(cards('m/2 s/2'), 4))).toBe('Z2 S3-4 H1 after B s/2');
	expect(gapNotation(gapsOf(cards('l/2 l/2'), 4))).toBe('');
});

test('on two columns, there are no gaps', () => {
	expect(gapsOf(cards('l/4 s/2'), 2)).toEqual([]);
});

test('a card dropped into a gap takes its size and comes after the anchor', () => {
	const items = cards('l/4 s/2 l/2');
	const [gap] = gapsOf(items, 6);
	const dropped = dropIntoGap(items, 2, gap, 6);
	expect(dropped).toEqual(cards('l/4 s/2 m/2'));
	expect(notation(layout(dropped, 6))).toBe('A Z1 S1-4 H4 · B Z1 S5-6 H1 · C Z2 S5-6 H2');
});

test('a card dropped into the gap below itself grows by it', () => {
	const items = cards('l/4 s/2');
	const [gap] = gapsOf(items, 6);
	expect(dropIntoGap(items, 1, gap, 6)).toEqual(cards('l/4 l/2'));
});

test('a card dropped into the gap at the end of its row grows by it', () => {
	const items = cards('s/2');
	const [gap] = gapsOf(items, 6);
	expect(dropIntoGap(items, 0, gap, 6)).toEqual(cards('s/full'));
});

test('a card moves ahead to the gap it is dropped into', () => {
	const items = cards('l/2 s/2 l/2 l/2');
	const gap = gapsOf(items, 6).find(({ anchor }) => anchor === 1);
	expect(gap).toBeDefined();
	expect(dropIntoGap(items, 3, gap!, 6)).toEqual(cards('l/2 s/2 m/2 l/2'));
});

test('on four columns, a width that looks the same is kept', () => {
	// The gap below A and B is 2 columns wide, like the 3 columns of D on four columns.
	const items = cards('m/2 s/2 l/3 l/3');
	const gap = gapsOf(items, 4).find(({ anchor }) => anchor === 1);
	expect(gap).toBeDefined();
	expect(dropIntoGap(items, 3, gap!, 4)).toEqual(cards('m/2 s/2 s/3 l/3'));
});

// The widths the card at `index` can take where the layout places it
const widths = (items: string, index: number, columns: number) =>
	widthSteps(cards(items)[index], layout(cards(items), columns)[index], columns).map(
		({ width }) => width
	);

test('on six columns, a card can take the widths that fit from its column, and full', () => {
	expect(widths('l/2', 0, 6)).toEqual(['2/6', '3/6', '4/6', '6/6']);
	expect(widths('l/3 l/2', 1, 6)).toEqual(['2/6', '3/6', '6/6']);
	expect(widths('l/4 l/2', 1, 6)).toEqual(['2/6', '6/6']);
});

test('on four columns, a card can be half or whole and keeps a width that looks the same', () => {
	expect(widths('l/2 l/2', 0, 4)).toEqual(['2/6', '6/6']);
	expect(widths('l/3 l/3', 0, 4)).toEqual(['3/6', '6/6']);
	expect(widths('l/4', 0, 4)).toEqual(['3/6', '4/6']);
	expect(widths('l/2 l/2', 1, 4)).toEqual(['2/6', '6/6']);
});

test('on four columns, a card that fills the end of its row keeps its width', () => {
	expect(widths('l/2 l/full', 0, 4)).toEqual(['2/6']);
	expect(widths('l/3 l/full', 0, 4)).toEqual(['3/6']);
});

test('on two columns, the width of a card cannot be dragged', () => {
	expect(widths('l/2', 0, 2)).toEqual([]);
});
