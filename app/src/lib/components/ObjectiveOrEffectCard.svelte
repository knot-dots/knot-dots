<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import Card from '$lib/components/Card.svelte';
	import TargetCheck from '$lib/components/TargetCheck.svelte';
	import { getReviewContext } from '$lib/contexts/review.svelte';
	import { isEffectContainer, isObjectiveContainer } from '$lib/models';
	import { reviewObjectiveOrEffect } from '$lib/reviewStatus';
	import { reviewStatusAuraColor } from '$lib/theme/models';

	type Props = Omit<ComponentProps<typeof Card>, 'auraColor' | 'titleAside'>;

	let { container, relatedContainers = [], ...props }: Props = $props();

	const review = getReviewContext();

	const reviewStatus = $derived(
		isEffectContainer(container) || isObjectiveContainer(container)
			? reviewObjectiveOrEffect(container, relatedContainers, review.objectivesByIndicator)?.status
			: undefined
	);

	const auraColor = $derived(reviewStatus && reviewStatusAuraColor(reviewStatus));
</script>

<Card {...props} {auraColor} {container} {relatedContainers}>
	{#snippet titleAside()}
		{#if reviewStatus}
			<TargetCheck status={reviewStatus} />
		{/if}
	{/snippet}
</Card>
