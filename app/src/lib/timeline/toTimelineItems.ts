import {
	type AnyPayload,
	type Container,
	isEventContainer,
	isGoalContainer,
	isMeasureContainer,
	isSimpleMeasureContainer,
	isTaskContainer
} from '$lib/models';
import { moduleByType } from '$lib/modules';

export interface TimelineItem {
	guid: string;
	// Times in milliseconds. For dates without a time, start is midnight and
	// end is midnight of the last day in local time.
	start: number;
	end?: number;
	allDay: boolean;
	title: string;
	badge: { label: string; module?: string };
	// The container itself, for the summary of the preview.
	container: Container<AnyPayload>;
	image?: { credit?: string; url: string };
	href: string;
}

interface Options {
	href: (guid: string) => string;
	// Returns the URL to use for a cover image or undefined to omit it.
	imageURL: (cover: string) => string | undefined;
	t: (key: string) => string;
}

const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/;

// Dates are split by hand because new Date('2027-03-15') is midnight UTC,
// which is the previous day in time zones west of UTC.
export function parseDate(value: string) {
	const match = isoDate.exec(value);
	if (!match) return undefined;
	return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).getTime();
}

// Date-times are instants in UTC and are shown in local time like everywhere
// else in the application.
export function parseDateTime(value: string) {
	const time = new Date(value).getTime();
	return Number.isNaN(time) ? undefined : time;
}

export function isInternalURL(url: string, base: string) {
	try {
		return new URL(url).origin === new URL(base).origin;
	} catch {
		return false;
	}
}

function dates(container: Container<AnyPayload>) {
	if (isEventContainer(container)) {
		return {
			allDay: false,
			start: container.payload.startDate ? parseDateTime(container.payload.startDate) : undefined,
			end: container.payload.endDate ? parseDateTime(container.payload.endDate) : undefined
		};
	} else if (isMeasureContainer(container) || isSimpleMeasureContainer(container)) {
		return {
			allDay: true,
			start: container.payload.startDate ? parseDate(container.payload.startDate) : undefined,
			end: container.payload.endDate ? parseDate(container.payload.endDate) : undefined
		};
	} else if (isGoalContainer(container) || isTaskContainer(container)) {
		return {
			allDay: true,
			start: container.payload.fulfillmentDate
				? parseDate(container.payload.fulfillmentDate)
				: undefined,
			end: undefined
		};
	}
	return { allDay: true, start: undefined, end: undefined };
}

// The same label as the type badge of Badges.svelte.
function badgeLabel(container: Container<AnyPayload>, t: Options['t']) {
	if (isGoalContainer(container)) {
		return t(container.payload.goalType ?? 'goal');
	} else if (isMeasureContainer(container) || isSimpleMeasureContainer(container)) {
		return t(container.payload.measureType ?? 'measure');
	} else if (isTaskContainer(container)) {
		return t(container.payload.taskCategory ?? 'task');
	}
	return t(container.payload.type);
}

function image(container: Container<AnyPayload>, { imageURL }: Options) {
	const payload = container.payload;
	if (!('cover' in payload) || !payload.cover) return undefined;

	const url = imageURL(payload.cover);
	if (!url) return undefined;

	return {
		url,
		...('coverSource' in payload && payload.coverSource ? { credit: payload.coverSource } : {})
	};
}

/**
 * Maps containers to the items of a timeline, sorted by time.
 *
 * Objects without a date can't be placed on a timeline and are only counted.
 */
export function toTimelineItems(containers: Container<AnyPayload>[], options: Options) {
	const items: TimelineItem[] = [];
	let skippedWithoutDate = 0;

	for (const container of containers) {
		const { allDay, start, end } = dates(container);

		// An end date on its own is shown as a single point in time.
		const startTime = start ?? end;
		if (startTime === undefined) {
			skippedWithoutDate++;
			continue;
		}

		const itemImage = image(container, options);
		const module = moduleByType.get(container.payload.type);
		items.push({
			guid: container.guid,
			start: startTime,
			...(start !== undefined && end !== undefined && end > start ? { end } : {}),
			allDay,
			title: 'title' in container.payload ? container.payload.title : '',
			badge: { label: badgeLabel(container, options.t), ...(module ? { module } : {}) },
			container,
			...(itemImage ? { image: itemImage } : {}),
			href: options.href(container.guid)
		});
	}

	items.sort((a, b) => a.start - b.start || (a.end ?? a.start) - (b.end ?? b.start));

	return { items, skippedWithoutDate };
}
