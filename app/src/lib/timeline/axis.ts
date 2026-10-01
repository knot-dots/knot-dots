import { type TimeInterval, timeDay, timeHour, timeMonth, timeYear } from 'd3-time';

export const DAY = 24 * 60 * 60 * 1000;

// Pixels per day, from decades down to hours
export const zoomLevels = [
	1 / 64,
	1 / 32,
	1 / 16,
	1 / 8,
	1 / 4,
	1 / 2,
	1,
	2,
	4,
	8,
	16,
	32,
	64,
	128,
	256,
	512,
	1024,
	2048
];

// Browsers limit the size of elements, so very wide tracks are not allowed.
const maxTrackWidth = 8_000_000;

/**
 * Returns the indices of the zoom levels that make sense for a period: from
 * the level showing all of it within the width to the most detailed level
 * whose track still fits into the browser.
 */
export function zoomRange(days: number, width: number) {
	let min = 0;
	while (min < zoomLevels.length - 1 && days * zoomLevels[min + 1] <= width) min++;
	let max = zoomLevels.length - 1;
	while (max > min && days * zoomLevels[max] > maxTrackWidth) max--;
	return { min, max };
}

type Format = 'day' | 'dayMonth' | 'decade' | 'hour' | 'month' | 'monthYear' | 'year';

interface Scale {
	// The approximate distance of minor ticks in days
	days: number;
	major: TimeInterval;
	majorFormat: Format;
	minor: TimeInterval;
	minorFormat: Format;
}

const decade = timeYear.every(10)!;

// d3-time aligns these intervals with the calendar in local time, e.g. every
// 6 hours are 0:00, 6:00, 12:00 and 18:00 also on days with a change to or
// from daylight saving time.
const scales: Scale[] = [
	...[1, 2, 3, 6, 12].map((hours) => ({
		days: hours / 24,
		major: timeDay,
		majorFormat: 'dayMonth' as const,
		minor: timeHour.every(hours)!,
		minorFormat: 'hour' as const
	})),
	...[1, 2, 7].map((days) => ({
		days,
		major: timeMonth,
		majorFormat: 'monthYear' as const,
		minor: timeDay.every(days)!,
		minorFormat: 'day' as const
	})),
	...[1, 3, 6].map((months) => ({
		days: months * 30.44,
		major: timeYear,
		majorFormat: 'year' as const,
		minor: timeMonth.every(months)!,
		minorFormat: 'month' as const
	})),
	...[1, 2, 5].map((years) => ({
		days: years * 365.25,
		major: decade,
		majorFormat: 'decade' as const,
		minor: timeYear.every(years)!,
		minorFormat: 'year' as const
	}))
];

const formatOptions: Record<Format, Intl.DateTimeFormatOptions> = {
	day: { day: 'numeric' },
	dayMonth: { day: 'numeric', month: 'short' },
	decade: { year: 'numeric' },
	hour: { hour: '2-digit', hourCycle: 'h23', minute: '2-digit' },
	// Formatted with a day, so that the month has the form it has in dates,
	// e.g. "März" instead of "Mär" in German
	month: { day: 'numeric', month: 'short' },
	monthYear: { month: 'short', year: 'numeric' },
	year: { year: 'numeric' }
};

const formatters = new Map<string, Intl.DateTimeFormat>();

function format(time: Date, kind: Format, locale: string) {
	const key = `${locale}:${kind}`;
	let formatter = formatters.get(key);
	if (!formatter) {
		formatter = new Intl.DateTimeFormat(locale, formatOptions[kind]);
		formatters.set(key, formatter);
	}
	if (kind === 'month') {
		return formatter.formatToParts(time).find(({ type }) => type === 'month')!.value;
	}
	return formatter.format(time);
}

export interface Tick {
	label: string;
	time: number;
}

/**
 * Returns the ticks of the time axis between start and end, so that the
 * labels of minor ticks are at least minSpacing pixels apart. Minor ticks at
 * the time of a major tick are omitted, the major tick is labeled instead.
 */
export function axisTicks(
	start: number,
	end: number,
	pxPerDay: number,
	locale: string,
	minSpacing = 56
) {
	const scale = scales.find(({ days }) => days * pxPerDay >= minSpacing) ?? scales.at(-1)!;
	const from = new Date(start);
	const to = new Date(end);

	const major = scale.major
		.range(scale.major.floor(from), to)
		.map((time) => ({ label: format(time, scale.majorFormat, locale), time: time.getTime() }));
	const majorTimes = new Set(major.map(({ time }) => time));
	const minor = scale.minor
		.range(scale.minor.floor(from), to)
		.filter((time) => !majorTimes.has(time.getTime()))
		.map((time) => ({ label: format(time, scale.minorFormat, locale), time: time.getTime() }));

	return { major, minor };
}

interface Extent {
	end?: number;
	start: number;
}

/**
 * Distributes items to rows so that they don't overlap: each item goes to
 * the first row with room for it. Items must be sorted by start.
 *
 * @param x - the position of a time in pixels
 * @param width - the minimum width of an item in pixels
 * @param gap - the minimum distance of items in a row in pixels
 */
export function layoutRows(items: Extent[], x: (time: number) => number, width: number, gap = 8) {
	const rowEnds: number[] = [];
	const rows = items.map(({ end, start }) => {
		const left = x(start);
		const right = Math.max(left + width, end === undefined ? 0 : x(end));
		let row = rowEnds.findIndex((rowEnd) => rowEnd + gap <= left);
		if (row === -1) row = rowEnds.length;
		rowEnds[row] = right;
		return row;
	});
	return { count: rowEnds.length, rows };
}

/**
 * Formats the date or the period of an item, with the time in the 24-hour
 * format unless the item lasts whole days.
 */
export function formatPeriod(
	{ allDay, end, start }: { allDay: boolean; end?: number; start: number },
	locale: string,
	dateStyle: 'long' | 'medium' = 'long'
) {
	const formatter = new Intl.DateTimeFormat(
		locale,
		allDay ? { dateStyle } : { dateStyle, hourCycle: 'h23', timeStyle: 'short' }
	);
	return end === undefined ? formatter.format(start) : formatter.formatRange(start, end);
}

/**
 * Returns the value of the datetime attribute of a time element.
 */
export function machineReadable(time: number, allDay: boolean) {
	const date = new Date(time);
	if (!allDay) return date.toISOString();
	const pad = (value: number) => String(value).padStart(2, '0');
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
