import * as Plot from '@observablehq/plot';
import { nice, ticks } from 'd3-array';

// The look that all charts of an indicator share, on dashboard cards, in the overlay and in
// collections: values by year, round values and years with grid lines, a y axis only as wide as
// its longest label, the unit above it, and the font of the page.

export const ownColor = 'var(--indicator-color-own-base)';

const grid = { stroke: 'var(--chart-grid)', strokeOpacity: 1 };

const marginBottom = 26;

const marginRight = 2;

const marginTop = 9;

// The extent of the values, widened by a tenth around a single value so that it gets a scale
export function valueExtent(values: number[]): [number, number] {
	const lowest = Math.min(...values);
	const highest = Math.max(...values);
	const margin = Math.abs(lowest) * 0.1 || 1;
	return lowest === highest ? [lowest - margin, highest + margin] : [lowest, highest];
}

// A single year gets room on both sides so that its point is not at the edge.
export function yearDomain(years: number[]): [number, number] {
	const first = Math.min(...years);
	const last = Math.max(...years);
	return first === last ? [first - 1, last + 1] : [first, last];
}

// As many round values as fit with 20 px between their labels. A chart too low for that keeps
// a scale of round values but labels only its ends, or only the top.
export function valueTicks([lowest, highest]: [number, number], plotHeight: number) {
	for (let count = Math.max(2, Math.floor(plotHeight / 40)); count >= 2; count--) {
		const [bottom, top] = nice(lowest, highest, count);
		const values = ticks(bottom, top, count);
		if (plotHeight / (values.length - 1) >= 20) {
			return { domain: [bottom, top], values };
		}
	}
	const [bottom, top] = nice(lowest, highest, 4);
	return { domain: [bottom, top], values: plotHeight >= 20 ? [bottom, top] : [top] };
}

// Round years, about one per 80 px
export function yearTicks(years: number[], plotWidth: number) {
	return ticks(
		Math.min(...years),
		Math.max(...years),
		Math.max(1, Math.floor(plotWidth / 80))
	).filter(Number.isInteger);
}

// Measures labels in the font of the element the chart goes into
export function textWidthIn(element: HTMLElement) {
	const style = getComputedStyle(element);
	const context = document.createElement('canvas').getContext('2d');
	if (context) {
		context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
	}
	return (text: string) => context?.measureText(text).width ?? text.length * 7;
}

interface AxesOptions {
	// The values the y axis covers
	extent: [number, number];
	format: (value: number) => string;
	height: number;
	textWidth: (text: string) => number;
	width: number;
	years: number[];
}

// Size, scales, margins, grid and axes of a chart; its marks come after `marks`.
export function indicatorChartOptions({
	extent,
	format,
	height,
	textWidth,
	width,
	years
}: AxesOptions) {
	const { domain, values } = valueTicks(extent, height - marginTop - marginBottom);
	const marginLeft = Math.ceil(Math.max(...values.map((value) => textWidth(format(value))))) + 8;
	const yearValues = yearTicks(years, width - marginLeft - marginRight);
	return {
		height,
		marginBottom,
		marginLeft,
		marginRight,
		marginTop,
		marks: [
			Plot.gridX(yearValues, grid),
			Plot.gridY(values, grid),
			Plot.axisY(values, { label: null, tickFormat: format, tickPadding: 8, tickSize: 0 }),
			Plot.axisX(yearValues, { label: null, tickFormat: 'd', tickPadding: 8, tickSize: 0 })
		],
		style: { fontFamily: 'inherit', fontSize: '0.75rem', overflow: 'visible' },
		width,
		x: { axis: null, domain: yearDomain(years), type: 'linear' },
		y: { axis: null, domain }
	} satisfies Plot.PlotOptions;
}
