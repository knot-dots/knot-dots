import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
	axisTicks,
	DAY,
	formatPeriod,
	layoutRows,
	machineReadable,
	zoomLevels,
	zoomRange
} from '$lib/timeline/axis';

beforeEach(() => {
	vi.stubEnv('TZ', 'Europe/Berlin');
});

afterEach(() => {
	vi.unstubAllEnvs();
});

const t = (...parts: [number, number, number?, number?]) => new Date(...parts).getTime();

describe('axisTicks', () => {
	test('labels hours in the 24-hour format and days as major ticks', () => {
		const { major, minor } = axisTicks(t(2026, 8, 30, 18), t(2026, 9, 1, 6), 512, 'de');

		expect(minor.map(({ label }) => label)).toEqual(['18:00', '21:00', '03:00']);
		expect(major.map(({ label }) => label)).toEqual(['30. Sept.', '1. Okt.']);
	});

	test('keeps hours aligned on the day of the change to daylight saving time', () => {
		const { minor } = axisTicks(t(2026, 2, 29), t(2026, 2, 29, 12), 256, 'de');

		expect(minor.map(({ time }) => new Date(time).getHours())).toEqual([6]);
		expect(
			axisTicks(t(2026, 2, 29), t(2026, 2, 29, 12), 512, 'de').minor.map(({ time }) =>
				new Date(time).getHours()
			)
		).toEqual([3, 6, 9]);
	});

	test('labels the same months every year', () => {
		const { major, minor } = axisTicks(t(2023, 10, 15), t(2025, 1, 15), 2, 'de');

		expect(minor.map(({ label }) => label)).toEqual([
			'Nov.',
			'Dez.',
			'Feb.',
			'März',
			'Apr.',
			'Mai',
			'Juni',
			'Juli',
			'Aug.',
			'Sept.',
			'Okt.',
			'Nov.',
			'Dez.',
			'Feb.'
		]);
		expect(major.map(({ label }) => label)).toEqual(['2023', '2024', '2025']);
	});

	test('labels quarters when zoomed out', () => {
		const { minor } = axisTicks(t(2023, 10, 15), t(2026, 1, 15), 1, 'de');

		expect(minor.map(({ time }) => new Date(time).getMonth() + 1)).toEqual([
			10, 4, 7, 10, 4, 7, 10
		]);
	});

	test('spaces months evenly when zoomed out', () => {
		const { minor } = axisTicks(t(2024, 0, 1), t(2026, 0, 1), 1 / 2, 'de');

		expect(minor.map(({ time }) => new Date(time).getMonth() + 1)).toEqual([7, 7]);
	});

	test('labels days of the month in a leap year', () => {
		const { major, minor } = axisTicks(t(2024, 1, 20), t(2024, 2, 3), 64, 'de');

		expect(minor.map(({ label }) => label)).toEqual([
			'20',
			'21',
			'22',
			'23',
			'24',
			'25',
			'26',
			'27',
			'28',
			'29',
			'2'
		]);
		expect(major.map(({ label }) => label)).toEqual(['Feb. 2024', 'März 2024']);
	});
});

describe('zoomRange', () => {
	test('starts with the level that shows the whole period', () => {
		const { max, min } = zoomRange(365, 1200);

		expect(365 * zoomLevels[min]).toBeLessThanOrEqual(1200);
		expect(365 * zoomLevels[min + 1]).toBeGreaterThan(1200);
		expect(max).toBe(zoomLevels.length - 1);
	});

	test('limits the width of the track', () => {
		const { max } = zoomRange(100 * 365, 1200);

		expect(100 * 365 * zoomLevels[max]).toBeLessThanOrEqual(8_000_000);
	});
});

describe('layoutRows', () => {
	const x = (time: number) => time / DAY;

	test('puts items into the first row with room for them', () => {
		const items = [{ start: 0 }, { start: 50 * DAY }, { start: 100 * DAY }, { start: 300 * DAY }];

		expect(layoutRows(items, x, 120)).toEqual({ count: 3, rows: [0, 1, 2, 0] });
	});

	test('reserves the length of a time span', () => {
		const items = [{ end: 500 * DAY, start: 0 }, { start: 200 * DAY }, { start: 600 * DAY }];

		expect(layoutRows(items, x, 120)).toEqual({ count: 2, rows: [0, 1, 0] });
	});
});

describe('formatPeriod', () => {
	test('formats dates and periods', () => {
		expect(formatPeriod({ allDay: true, start: t(2027, 2, 15) }, 'de')).toBe('15. März 2027');
		// Intl puts thin spaces around the dash
		expect(
			formatPeriod({ allDay: true, end: t(2027, 4, 1), start: t(2027, 2, 15) }, 'de').replace(
				/\s/g,
				' '
			)
		).toBe('15. März – 1. Mai 2027');
	});

	test('formats times in the 24-hour format', () => {
		expect(formatPeriod({ allDay: false, start: t(2027, 2, 15, 18) }, 'en')).toBe(
			'March 15, 2027 at 18:00'
		);
	});
});

describe('machineReadable', () => {
	test('returns dates without time for whole days', () => {
		expect(machineReadable(t(2027, 2, 5), true)).toBe('2027-03-05');
	});
});
