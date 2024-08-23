<script lang="ts">
	import { _, date } from 'svelte-i18n';
	import Cog8Tooth from '~icons/heroicons/cog-8-tooth-16-solid';
	import { page } from '$app/stores';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import ContainerDetailView from '$lib/components/ContainerDetailView.svelte';
	import Summary from '$lib/components/Summary.svelte';
	import Viewer from '$lib/components/Viewer.svelte';
	import {
		isSimpleMeasureContainer,
		isStrategyContainer,
		overlayKey,
		overlayURL,
		resolutionStatus
	} from '$lib/models';
	import type { AnyContainer, Container, ResolutionContainer } from '$lib/models';
	import { resolutionStatusColors, resolutionStatusIcons } from '$lib/theme/models';

	export let container: ResolutionContainer;
	export let relatedContainers: Container[];
	export let revisions: AnyContainer[];

	let selectedRevision: ResolutionContainer;

	$: {
		const parseResult = resolutionStatus.safeParse(
			paramsFromURL($page.url).get('resolutionStatus')
		);
		if (parseResult.success) {
			selectedRevision =
				(revisions as ResolutionContainer[]).findLast(
					({ payload }) => payload.resolutionStatus == parseResult.data
				) ?? container;
		} else {
			selectedRevision = container;
		}
	}

	$: strategy = relatedContainers.find(isStrategyContainer);
</script>

<ContainerDetailView container={selectedRevision} {relatedContainers} {revisions}>
	<svelte:fragment slot="data">
		{#if 'summary' in container.payload || ('description' in container.payload && !isSimpleMeasureContainer(container))}
			<div class="summary">
				<h3>{$_('summary')}</h3>
				<Summary container={selectedRevision} />
			</div>
		{/if}

		{#if 'description' in container.payload}
			<div class="description">
				<h3>{$_('description')}</h3>
				<Viewer value={selectedRevision.payload.description} />
			</div>
		{/if}

		{#if 'validFrom' in selectedRevision.payload || 'validUntil' in selectedRevision.payload}
			<div class="meta">
				<h3 class="meta-key">{$_('valid_from')}</h3>
				<p class="meta-value">
					{#if selectedRevision.payload.validFrom && selectedRevision.payload.validUntil}
						{$date(new Date(selectedRevision.payload.validFrom), { format: 'short' })}–{$date(
							new Date(selectedRevision.payload.validUntil),
							{
								format: 'short'
							}
						)}
					{:else if selectedRevision.payload.validFrom}
						{$date(new Date(selectedRevision.payload.validFrom), { format: 'short' })}
					{/if}
				</p>
			</div>
		{/if}
	</svelte:fragment>

	<svelte:fragment slot="meta">
		<div class="meta">
			<h3 class="meta-key">{$_('status.label')}</h3>
			<p class="meta-value">
				<span
					class="badge badge--{resolutionStatusColors.get(
						selectedRevision.payload.resolutionStatus
					)}"
				>
					<svelte:component
						this={resolutionStatusIcons.get(selectedRevision.payload.resolutionStatus) ?? Cog8Tooth}
					/>
					{$_(selectedRevision.payload.resolutionStatus)}
				</span>
			</p>
		</div>

		{#if strategy}
			<div class="meta">
				<h3 class="meta-key">{$_('strategy')}</h3>
				<p class="meta-value">
					<a href={overlayURL($page.url, overlayKey.enum.view, strategy.guid)}>
						{$_(strategy.payload.title)}
					</a>
				</p>
			</div>

			<div class="meta">
				<h3 class="meta-key">{$_('strategy_type.label')}</h3>
				<p class="meta-value">{$_(strategy.payload.strategyType)}</p>
			</div>
		{/if}
	</svelte:fragment>

	<svelte:fragment slot="extra"></svelte:fragment>
</ContainerDetailView>
