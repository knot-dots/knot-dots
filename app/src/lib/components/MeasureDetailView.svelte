<script lang="ts">
	import { _, date } from 'svelte-i18n';
	import ArrowDownTray from '~icons/heroicons/arrow-down-tray-20-solid';
	import LightBulb from '~icons/heroicons/light-bulb-16-solid';
	import { page } from '$app/stores';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import ContainerDetailView from '$lib/components/ContainerDetailView.svelte';
	import PartOfMeasureCarousel from '$lib/components/PartOfMeasureCarousel.svelte';
	import Progress from '$lib/components/Progress.svelte';
	import Summary from '$lib/components/Summary.svelte';
	import Viewer from '$lib/components/Viewer.svelte';
	import {
		isMeasureContainer,
		isSimpleMeasureContainer,
		isStrategyContainer,
		overlayKey,
		payloadTypes,
		status
	} from '$lib/models';
	import type { AnyContainer, Container, ContainerWithEffect } from '$lib/models';
	import { statusColors, statusIcons } from '$lib/theme/models';

	export let container: ContainerWithEffect;
	export let relatedContainers: Container[];
	export let revisions: AnyContainer[];

	let selectedRevision: ContainerWithEffect;

	$: {
		const parseResult = status.safeParse(paramsFromURL($page.url).get('status'));
		if (parseResult.success) {
			selectedRevision =
				(revisions as ContainerWithEffect[]).findLast(
					({ payload }) => payload.status == parseResult.data
				) ?? container;
		} else {
			selectedRevision = container;
		}
	}

	$: strategy = relatedContainers.find(isStrategyContainer);

	let isPage = $page.url.pathname == `/${container.payload.type}/${container.guid}`;

	function containerURL(type: string, guid: string) {
		if (isPage) {
			return `/${type}/${guid}`;
		} else {
			const query = paramsFromURL($page.url);
			query.set(overlayKey.enum.view, guid);
			return `#${query.toString()}`;
		}
	}
</script>

<ContainerDetailView container={selectedRevision} {relatedContainers} {revisions}>
	<svelte:fragment slot="data">
		{#if 'summary' in container.payload || ('description' in container.payload && !isSimpleMeasureContainer(container))}
			<div class="summary">
				<h3>{$_('measure.summary')}</h3>
				<Summary container={selectedRevision} />
			</div>
		{/if}

		{#if 'description' in container.payload}
			<div class="description">
				<h3>{$_('description')}</h3>
				<Viewer value={selectedRevision.payload.description} />
			</div>
		{/if}

		{#if 'progress' in selectedRevision.payload}
			<div class="progress">
				<h3>{$_('progress')}</h3>
				<Progress value={selectedRevision.payload.progress} />
			</div>
		{/if}

		{#if 'annotation' in selectedRevision.payload && (selectedRevision.payload.status === status.enum['status.in_planning'] || isSimpleMeasureContainer(selectedRevision))}
			<div class="annotation">
				<h3>{$_('annotation')}</h3>
				<Viewer value={selectedRevision.payload.annotation} />
			</div>
		{:else if 'comment' in selectedRevision.payload && selectedRevision.payload.status === status.enum['status.in_implementation']}
			<div class="comment">
				<h3>{$_('comment')}</h3>
				<Viewer value={selectedRevision.payload.comment} />
			</div>
		{:else if 'result' in selectedRevision.payload && (selectedRevision.payload.status === status.enum['status.in_operation'] || selectedRevision.payload.status === status.enum['status.done'])}
			<div class="result">
				<h3>{$_('result')}</h3>
				<Viewer value={selectedRevision.payload.result} />
			</div>
		{/if}

		{#if 'file' in container.payload && container.payload.file.length > 0}
			<div class="meta">
				<h3 class="meta-key">{$_('files')}</h3>
				<ul class="meta-value">
					{#each container.payload.file as file}
						<li>
							<a href={file[0]}>
								{file[1]}
								<ArrowDownTray />
							</a>
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		<div id="resources">
			<h3>{$_('resources')}</h3>
			<PartOfMeasureCarousel
				{container}
				{relatedContainers}
				payloadType={payloadTypes.enum.resource}
			/>
		</div>

		<div id="goals">
			<h3>{$_('goals')}</h3>
			<PartOfMeasureCarousel {container} {relatedContainers} payloadType={payloadTypes.enum.goal} />
		</div>
	</svelte:fragment>

	<svelte:fragment slot="meta">
		{#if 'measureType' in selectedRevision.payload}
			<div class="meta">
				<h3 class="meta-key">{$_('measure_type')}</h3>
				<ul class="meta-value">
					{#each selectedRevision.payload.measureType as measureType}
						<li>{$_(measureType)}</li>
					{/each}
				</ul>
			</div>
		{/if}

		<div class="meta">
			<h3 class="meta-key">{$_('status')}</h3>
			<p class="meta-value">
				<span class="badge badge--{statusColors.get(selectedRevision.payload.status)}">
					<svelte:component this={statusIcons.get(selectedRevision.payload.status) ?? LightBulb} />
					{$_(selectedRevision.payload.status)}
				</span>
			</p>
		</div>

		{#if 'startDate' in selectedRevision.payload || 'endDate' in selectedRevision.payload}
			<div class="meta">
				<h3 class="meta-key">{$_('planned_duration')}</h3>
				<p class="meta-value">
					{#if selectedRevision.payload.startDate && selectedRevision.payload.endDate}
						{$date(new Date(selectedRevision.payload.startDate), { format: 'short' })}–{$date(
							new Date(selectedRevision.payload.endDate),
							{
								format: 'short'
							}
						)}
					{:else if selectedRevision.payload.startDate}
						{$date(new Date(selectedRevision.payload.startDate), { format: 'short' })}–
					{/if}
				</p>
			</div>
		{/if}

		{#if strategy}
			<div class="meta">
				<h3 class="meta-key">{$_('strategy')}</h3>
				<p class="meta-value">
					{#if $page.url.pathname === `/strategy/${strategy.guid}`}
						{$_(strategy.payload.title)}
					{:else}
						<a href={containerURL(strategy.payload.type, strategy.guid)}>
							{$_(strategy.payload.title)}
						</a>
					{/if}
				</p>
			</div>

			<div class="meta">
				<h3 class="meta-key">{$_('strategy_type.label')}</h3>
				<p class="meta-value">{$_(strategy.payload.strategyType)}</p>
			</div>
		{/if}
	</svelte:fragment>
</ContainerDetailView>
