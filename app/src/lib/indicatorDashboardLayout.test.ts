import { describe, expect, test } from 'vitest';
import { columnsFor, layout, type Placement, rowHeightFor } from '$lib/indicatorDashboardLayout';

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
