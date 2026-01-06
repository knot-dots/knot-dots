<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import { type TeaserContainer } from '$lib/models';
	import ArrowRight from '~icons/knotdots/arrow-right';

	interface Props {
		container: TeaserContainer;
		editable: boolean;
		maxSummaryLength?: number;
	}

	const { container, editable, maxSummaryLength }: Props = $props();

	function teaserUrl(container: TeaserContainer) {
		const link = container.payload.link;
		if (!link) return undefined;
		return () => link;
	}
</script>

<div class="teaser-card">
	<Card {container} href={editable ? undefined : teaserUrl(container)} {maxSummaryLength}>
		{#snippet button()}
			{#if container.payload.linkCaption}
				{#if container.payload.style === 'default'}
					<a href={container.payload.link}>
						<span
							>{container.payload.linkCaption}
							<ArrowRight /></span
						>
					</a>
				{:else if container.payload.style === 'external'}
					<a href={container.payload.link} target="_blank">
						<span
							>{container.payload.linkCaption}
							<ArrowRight /></span
						>
					</a>
				{:else}
					<a href={container.payload.link} class="button button--action">
						<span
							>{container.payload.linkCaption}
							<ArrowRight /></span
						>
					</a>
				{/if}
			{/if}
		{/snippet}
	</Card>
</div>

<style>
	:global(.teaser-card .card .body) {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	:global(.teaser-card .card .body img) {
		border-radius: 0.5rem;
	}
	:global(.teaser-card .card footer) {
		justify-content: flex-end;
	}
	a span {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
</style>
