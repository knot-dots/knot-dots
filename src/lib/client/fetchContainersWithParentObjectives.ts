import { z } from 'zod';
import { containerWithObjective } from '$lib/models';
import type { IndicatorContainer } from '$lib/models';

export default async function fetchContainersWithParentObjectives({ guid }: IndicatorContainer) {
	const response = await fetch(`/container/${guid}/parent-objectives`);
	const data = await response.json();
	return z.array(containerWithObjective).parse(data);
}
