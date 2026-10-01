<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { env } from '$env/dynamic/public';
	import { page } from '$app/state';
	import Timeline from '$lib/components/Timeline.svelte';
	import { type AnyPayload, type Container, overlayURL } from '$lib/models';
	import { isInternalURL, toTimelineItems } from '$lib/timeline/toTimelineItems';
	import transformFileURL from '$lib/transformFileURL';

	interface Props {
		editable?: boolean;
		heading: 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
		items: Container<AnyPayload>[];
		label: string;
		limit: number;
		loading: boolean;
		showPreview: boolean;
		total: number;
	}

	let {
		editable = false,
		heading,
		items,
		label,
		limit,
		loading,
		showPreview,
		total
	}: Props = $props();

	const nextHeading = { h2: 'h3', h3: 'h4', h4: 'h5', h5: 'h6', h6: 'h6' } as const;

	let timeline = $derived(
		toTimelineItems(items, {
			href: (guid) => overlayURL(page.url, 'view', guid),
			imageURL: (cover) => {
				const url = transformFileURL(cover);
				return isInternalURL(url, env.PUBLIC_CDN_URL) ? url : undefined;
			},
			t: (key) => $_(key)
		})
	);
</script>

{#if timeline.items.length > 0}
	<Timeline heading={nextHeading[heading]} items={timeline.items} {label} {showPreview} />
{:else if editable && !loading}
	<p class="timeline-hint">{$_('timeline.empty')}</p>
{/if}

{#if editable && timeline.skippedWithoutDate > 0}
	<p class="timeline-hint">
		{$_('timeline.skipped_without_date', { values: { count: timeline.skippedWithoutDate } })}
	</p>
{/if}

{#if editable && total > limit}
	<p class="timeline-hint">{$_('timeline.limit_exceeded', { values: { limit, total } })}</p>
{/if}

<style>
	/* Span the full width of the content area like the carousel. */
	.timeline-hint {
		color: var(--color-text-subtle);
		font-size: 0.875rem;
		margin-top: 0.5rem;
	}
</style>
