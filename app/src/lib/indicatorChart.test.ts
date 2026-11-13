import { expect, test } from 'vitest';
import { valueExtent, valueTicks, yearDomain, yearTicks } from '$lib/indicatorChart';

test('a single value gets a scale of a tenth around it', () => {
	expect(valueExtent([480, 540, 500])).toEqual([480, 540]);
	expect(valueExtent([50])).toEqual([45, 55]);
	expect(valueExtent([0])).toEqual([-1, 1]);
});

test('a single year gets room on both sides', () => {
	expect(yearDomain([2014, 2023, 2018])).toEqual([2014, 2023]);
	expect(yearDomain([2023])).toEqual([2022, 2024]);
});

test('the y axis has round values with at least 20 px between their labels', () => {
	expect(valueTicks([480, 540], 200)).toEqual({
		domain: [480, 540],
		values: [480, 490, 500, 510, 520, 530, 540]
	});
	expect(valueTicks([0, 8.9], 300).domain).toEqual([0, 9]);
});

test('a low y axis labels only its ends, or only the top', () => {
	expect(valueTicks([480, 540], 30).values).toEqual([480, 540]);
	expect(valueTicks([480, 540], 10).values).toEqual([540]);
});

test('the x axis has round years, about one per 80 px', () => {
	expect(yearTicks([2012, 2023], 400)).toEqual([2012, 2014, 2016, 2018, 2020, 2022]);
	expect(yearTicks([2012, 2023], 160)).toEqual([2015, 2020]);
	expect(yearTicks([2018, 2019], 600)).toEqual([2018, 2019]);
	expect(yearTicks([2023], 400)).toEqual([2023]);
});
