import { z } from 'zod';
import { container } from '$lib/models';
import type { IndicatorContainer } from '$lib/models';

export default async function fetchContainersWithParentObjectives({ guid }: IndicatorContainer) {
	const response = await fetch(`/container/${guid}/parent-objectives`);
	const data = await response.json();
	return z.array(container).parse(data);
}
