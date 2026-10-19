<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import TargetCheck from '$lib/components/TargetCheck.svelte';
	import { getReviewContext } from '$lib/contexts/review.svelte';
	import { overlayKey, overlayURL } from '$lib/models';
	import { type IndicatorReview, isAssessed, type Target } from '$lib/reviewStatus';
	import { reviewStatusAuraColor, reviewStatusColors, reviewStatusIcons } from '$lib/theme/models';

	let { programs, status }: IndicatorReview = $props();

	const review = getReviewContext();

	let programRows = $derived(
		programs.flatMap((programReview) => {
			const container = review.selectedPrograms.find(({ guid }) => guid === programReview.program);
			return container ? [{ ...programReview, container }] : [];
		})
	);

	const Icon = $derived(reviewStatusIcons.get(status));

	const targetNames = new Map<Target, string>([
		[1, 'up'],
		[0, 'stable'],
		[-1, 'down'],
		[true, 'fulfilled'],
		[false, 'unfulfilled']
	]);
</script>

<section
	class="review-banner"
	style:--aura-color={reviewStatusAuraColor(status)}
	style:--status-color={`var(--color-${reviewStatusColors.get(status)}-700)`}
>
	<header>
		<h2>{$_('review_banner.title')}</h2>
		<p class="status">
			{#if Icon}
				<Icon aria-hidden="true" />
			{/if}
			{$_(status)}
		</p>
	</header>

	<ul>
		{#each programRows as { container, status, target } (container.guid)}
			<li>
				{#if isAssessed(status)}
					<TargetCheck {status} />
				{/if}
				<div>
					<a href={overlayURL(page.url, overlayKey.enum.view, container.guid)}>
						{container.payload.title}
					</a>
					{#if status === 'review_status.no_target'}
						<span>{$_('review_banner.no_target')}</span>
					{:else if target !== undefined}
						<span>
							{$_('review_banner.target', { values: { target: targetNames.get(target) } })}
						</span>
					{/if}
				</div>
			</li>
		{/each}
	</ul>
</section>

<style>
	.review-banner {
		/* Decorative glow near the top right corner, see target-check-aura in Figma */
		background: radial-gradient(
				circle at calc(100% - 20px) 20px,
				var(--aura-color, transparent) 30px,
				transparent 170px
			)
			#ffffff;
		border: 1px solid var(--color-gray-100);
		border-radius: var(--card-border-radius);
		display: flex;
		flex-wrap: wrap;
		gap: 2rem;
		margin-bottom: 1rem;
		padding: 1.5rem;
	}

	header {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	h2 {
		color: var(--color-gray-500);
		font-size: 0.75rem;
		font-weight: 500;
		line-height: 1.5;
	}

	.status {
		align-items: center;
		color: var(--status-color);
		display: flex;
		font-size: 1rem;
		font-weight: 600;
		gap: 0.5rem;
		line-height: 1.5;
	}

	.status > :global(svg) {
		flex-shrink: 0;
		height: 1.25rem;
		width: 1.25rem;
	}

	ul {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 0.75rem;
		min-width: 12rem;
	}

	li {
		align-items: flex-start;
		display: flex;
		gap: 0.5rem;
	}

	/* The program rows use the small icon size */
	li > :global(.target-check) {
		flex-shrink: 0;
		height: 1.3125rem;
		width: 1rem;
	}

	li > :global(.target-check svg) {
		height: 1rem;
		width: 1rem;
	}

	li > div {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
	}

	a {
		color: var(--color-gray-900);
		font-size: 0.875rem;
		font-weight: 500;
		line-height: 1.5;
		text-decoration: underline;
	}

	span {
		color: var(--color-gray-500);
		font-size: 0.75rem;
		line-height: 1.25;
	}
</style>
