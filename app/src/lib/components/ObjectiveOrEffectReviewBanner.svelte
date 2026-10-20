<script lang="ts">
	import ReviewBanner from '$lib/components/ReviewBanner.svelte';
	import { getReviewContext } from '$lib/contexts/review.svelte';
	import type { AnyPayload, Container, EffectPayload, ObjectivePayload } from '$lib/models';
	import { reviewObjectiveOrEffect } from '$lib/reviewStatus';

	interface Props {
		container: Container<EffectPayload> | Container<ObjectivePayload>;
		relatedContainers: Container<AnyPayload>[];
	}

	let { container, relatedContainers }: Props = $props();

	const review = getReviewContext();

	let objectiveOrEffectReview = $derived(
		reviewObjectiveOrEffect(container, relatedContainers, review.objectivesByIndicator)
	);
</script>

{#if objectiveOrEffectReview}
	<div class="details-section">
		<ReviewBanner {...objectiveOrEffectReview} />
	</div>
{/if}
