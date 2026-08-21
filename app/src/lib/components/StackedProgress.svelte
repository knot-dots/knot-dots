<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import tooltip from '$lib/attachments/tooltip';
	import { type ContainerWithStatus, overlayKey, overlayURL } from '$lib/models';
	import { statusColors } from '$lib/theme/models';

	interface Props {
		interactive?: boolean;
		segments: ContainerWithStatus[];
	}

	let { interactive = false, segments }: Props = $props();
</script>

<div class="stacked-progress">
	{#each segments as segment (segment.guid)}
		{#if interactive}
			{@const label = `${'title' in segment.payload ? segment.payload.title : ''}: ${$_(segment.payload.status)}`}
			<!-- svelte-ignore a11y_consider_explicit_label (the tooltip attachment provides aria-labelledby) -->
			<a
				class="segment"
				href={overlayURL(page.url, overlayKey.enum.view, segment.guid)}
				style:background={`var(--color-${statusColors.get(segment.payload.status)}-300)`}
				{@attach tooltip(label)}
			></a>
		{:else}
			<div
				class="segment"
				style:background={`var(--color-${statusColors.get(segment.payload.status)}-300)`}
			></div>
		{/if}
	{/each}
</div>

<style>
	.stacked-progress {
		background: var(--color-gray-200);
		border-radius: calc(infinity * 1px);
		display: flex;
		flex: 1 1;
		gap: 2px;
		height: 0.5rem;
		overflow: hidden;
		width: 100%;
	}

	.segment {
		flex: 1 1 0;
	}
</style>
