import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { anyContainer, type AnyPayload, type Container } from '$lib/models';
import {
	isInternalURL,
	parseDate,
	parseDateTime,
	toTimelineItems
} from '$lib/timeline/toTimelineItems';

const organization = '1d048b81-780a-41ad-813e-5111a23099fb';

const cdn = 'http://localhost:8082';

function makeContainer(guid: string, payload: Record<string, unknown>): Container<AnyPayload> {
	return anyContainer.parse({
		guid,
		managed_by: organization,
		organization,
		organizational_unit: null,
		payload,
		realm: 'test',
		revision: 1,
		valid_currently: true,
		valid_from: new Date('2026-01-01T00:00:00.000Z')
	});
}

const options = {
	href: (guid: string) => `#view=${guid}`,
	imageURL: (cover: string) => (isInternalURL(cover, cdn) ? cover : undefined),
	t: (key: string) => `t:${key}`
};

const guids = {
	event: '00000000-0000-4000-8000-000000000001',
	goal: '00000000-0000-4000-8000-000000000002',
	measure: '00000000-0000-4000-8000-000000000003',
	task: '00000000-0000-4000-8000-000000000004'
};

describe('parseDate', () => {
	beforeEach(() => {
		vi.stubEnv('TZ', 'America/New_York');
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	test('returns local midnight of the calendar day regardless of the time zone', () => {
		const date = new Date(parseDate('2027-03-15')!);

		expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([
			2027, 2, 15, 0
		]);
	});

	test('rejects values that are not ISO dates', () => {
		expect(parseDate('15.03.2027')).toBeUndefined();
	});
});

describe('parseDateTime', () => {
	test('keeps the instant', () => {
		expect(parseDateTime('2027-03-15T09:30:00Z')).toBe(Date.UTC(2027, 2, 15, 9, 30));
	});

	test('rejects invalid values', () => {
		expect(parseDateTime('tomorrow')).toBeUndefined();
	});
});

describe('toTimelineItems', () => {
	test('maps start and end dates of measures', () => {
		const { items } = toTimelineItems(
			[
				makeContainer(guids.measure, {
					endDate: '2028-12-31',
					startDate: '2027-01-01',
					title: 'Radwegenetz',
					type: 'measure'
				})
			],
			options
		);

		expect(items[0]).toMatchObject({
			allDay: true,
			end: parseDate('2028-12-31'),
			guid: guids.measure,
			href: `#view=${guids.measure}`,
			start: parseDate('2027-01-01'),
			title: 'Radwegenetz'
		});
	});

	test('shows a measure with only an end date as a point in time', () => {
		const { items } = toTimelineItems(
			[makeContainer(guids.measure, { endDate: '2028-12-31', title: 'M', type: 'measure' })],
			options
		);

		expect(items[0].start).toBe(parseDate('2028-12-31'));
		expect(items[0].end).toBeUndefined();
	});

	test('uses the fulfillment date of goals and tasks and sorts by time', () => {
		const { items } = toTimelineItems(
			[
				makeContainer(guids.goal, { fulfillmentDate: '2030-06-01', title: 'G', type: 'goal' }),
				makeContainer(guids.task, { fulfillmentDate: '2027-02-01', title: 'T', type: 'task' })
			],
			options
		);

		expect(items.map(({ guid }) => guid)).toEqual([guids.task, guids.goal]);
		expect(items.map(({ start }) => start)).toEqual([
			parseDate('2027-02-01'),
			parseDate('2030-06-01')
		]);
	});

	test('includes the time of events', () => {
		const { items } = toTimelineItems(
			[
				makeContainer(guids.event, {
					startDate: '2027-03-15T09:30:00.000Z',
					title: 'Ratssitzung',
					type: 'event'
				})
			],
			options
		);

		expect(items[0]).toMatchObject({ allDay: false, start: Date.UTC(2027, 2, 15, 9, 30) });
	});

	test('counts and omits objects without a date', () => {
		const { items, skippedWithoutDate } = toTimelineItems(
			[
				makeContainer(guids.goal, { title: 'G', type: 'goal' }),
				makeContainer(guids.task, { fulfillmentDate: '2027-02-01', title: 'T', type: 'task' })
			],
			options
		);

		expect(items.map(({ guid }) => guid)).toEqual([guids.task]);
		expect(skippedWithoutDate).toBe(1);
	});

	test('labels the badge like the detail view', () => {
		const { items } = toTimelineItems(
			[
				makeContainer(guids.measure, {
					measureType: 'measure_type.project',
					startDate: '2027-01-01',
					title: 'M',
					type: 'measure'
				}),
				makeContainer(guids.event, {
					startDate: '2027-03-15T09:30:00.000Z',
					title: 'E',
					type: 'event'
				})
			],
			options
		);

		expect(items[0].badge).toEqual({
			label: 't:measure_type.project',
			module: 'implementation-planning'
		});
		expect(items[1].badge).toEqual({ label: 't:event' });
	});

	test('only uses internal cover images', () => {
		const { items } = toTimelineItems(
			[
				makeContainer(guids.goal, {
					cover: `${cdn}/knot-dots/4d0e2f41-9c7e-4b9f-8f7e-3c8d2b1a0e5f`,
					coverSource: 'Foto: Stadt',
					fulfillmentDate: '2030-06-01',
					title: 'G',
					type: 'goal'
				}),
				makeContainer(guids.task, {
					cover: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Example.jpg',
					fulfillmentDate: '2031-02-01',
					title: 'T',
					type: 'task'
				})
			],
			options
		);

		expect(items[0].image).toEqual({
			credit: 'Foto: Stadt',
			url: `${cdn}/knot-dots/4d0e2f41-9c7e-4b9f-8f7e-3c8d2b1a0e5f`
		});
		expect(items[1].image).toBeUndefined();
	});
});
