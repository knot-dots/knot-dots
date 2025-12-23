<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import { type TeaserContainer } from '$lib/models';
	import ArrowRight from '~icons/knotdots/arrow-right';

	interface Props {
		container: TeaserContainer;
		editable: boolean;
	}

	const { container, editable }: Props = $props();

	function teaserUrl(container: TeaserContainer) {
		const link = container.payload.link;
		if (!link) return undefined;
		return () => link;
	}
</script>

<Card {container} href={editable ? undefined : teaserUrl(container)}>
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

<style>
	a span {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
</style>
