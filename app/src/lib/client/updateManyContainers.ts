import { z } from 'zod';
import { type AnyContainer, anyContainer, type AnyPayload } from '$lib/models';
import { lastDeletedContainers, lastUpdatedContainers } from '$lib/stores';

export async function updateManyContainers(data: {
	deleted?: boolean;
	guid: string[];
	organization: string;
	organizational_unit: string | null;
	payload?: Partial<AnyPayload>;
}) {
	const response = await fetch(`/container/bulk-action`, {
		method: 'POST',
		body: JSON.stringify(data)
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(text);
	}

	const updatedContainers = z.array(anyContainer).parse(await response.json());

	if (data.deleted) {
		lastDeletedContainers.update(
			(map) =>
				new Map([...map, ...updatedContainers.map((c): [string, AnyContainer] => [c.guid, c])])
		);
	} else {
		lastUpdatedContainers.update(
			(map) =>
				new Map([...map, ...updatedContainers.map((c): [string, AnyContainer] => [c.guid, c])])
		);
	}

	return updatedContainers;
}
