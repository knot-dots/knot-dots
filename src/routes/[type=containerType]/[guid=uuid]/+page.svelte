<script lang="ts">
	import { ChevronLeft, Icon, Pencil } from 'svelte-hero-icons';
	import ContainerDetailView from '$lib/components/ContainerDetailView.svelte';
	import InternalObjectiveDetailView from '$lib/components/InternalObjectiveDetailView.svelte';
	import InternalObjectiveTaskDetailView from '$lib/components/InternalObjectiveTaskDetailView.svelte';
	import MeasureDetailView from '$lib/components/MeasureDetailView.svelte';
	import MeasureTabs from '$lib/components/MeasureTabs.svelte';
	import StrategyDetailView from '$lib/components/StrategyDetailView.svelte';
	import Overlay from '$lib/components/Overlay.svelte';
	import TaskTabs from '$lib/components/TaskTabs.svelte';
	import {
		isContainer,
		isEmptyOrganizationalUnitContainer,
		isInternalObjectiveContainer,
		isMeasureContainer,
		isStrategyContainer,
		isTaskContainer,
		payloadTypes
	} from '$lib/models';
	import { ability, overlay } from '$lib/stores';
	import type { PageData } from './$types';

	export let data: PageData;

	$: container = data.container;
	$: relatedContainers = data.relatedContainers;
	$: revisions = data.revisions;
</script>

{#if isStrategyContainer(container)}
	<div class="strategy">
		<div class="detail-page-content strategy-inner">
			<header class="content-header">
				<h2 class="strategy-title with-icons">
					{container.payload.title}
					<span class="icons">
						{#if $ability.can('update', container)}
							<a href="#view={container.guid}&edit" class="icons-element">
								<Icon solid src={Pencil} size="20" />
							</a>
						{/if}
						<button class="icons-element" type="button" on:click={() => window.history.back()}>
							<Icon solid src={ChevronLeft} size="20" />
						</button>
					</span>
				</h2>
			</header>
			<div class="content-details masked-overflow">
				<StrategyDetailView {container} {relatedContainers} {revisions} />
			</div>
		</div>
	</div>
	{#if $overlay.revisions[$overlay.revisions.length - 1]}
		<Overlay {...$overlay} />
	{/if}
{:else}
	<div class="detail-page-content">
		<header class="content-header">
			<h2 class="with-icons">
				{#if container.payload.type === payloadTypes.enum.organization || container.payload.type === payloadTypes.enum.organizational_unit}
					{container.payload.name}
				{:else}
					{container.payload.title}
				{/if}
				<span class="icons">
					{#if $ability.can('update', container)}
						<a href="{container.guid}/edit" class="icons-element">
							<Icon solid src={Pencil} size="20" />
						</a>
					{/if}
					<button class="icons-element" type="button" on:click={() => window.history.back()}>
						<Icon solid src={ChevronLeft} size="20" />
					</button>
				</span>
			</h2>
			{#if isMeasureContainer(container)}
				<MeasureTabs {container} {revisions} />
			{:else if isTaskContainer(container)}
				<TaskTabs {container} {revisions} />
			{/if}
		</header>
		<div class="content-details masked-overflow">
			{#if isMeasureContainer(container)}
				<MeasureDetailView {container} {relatedContainers} {revisions} />
			{:else if isTaskContainer(container)}
				<InternalObjectiveTaskDetailView {container} {relatedContainers} {revisions} />
			{:else if isInternalObjectiveContainer(container)}
				<InternalObjectiveDetailView {container} {relatedContainers} {revisions} />
			{:else if isEmptyOrganizationalUnitContainer(container)}
				<ContainerDetailView {container} {relatedContainers} {revisions} />
			{:else if isContainer(container)}
				<ContainerDetailView {container} {relatedContainers} {revisions} />
			{/if}
		</div>
	</div>
{/if}

<style>
	header {
		border-bottom: solid 1px var(--color-gray-300);
		padding: 1.5rem;
	}

	.strategy {
		flex: 1 1;
		overflow-x: auto;
	}

	.strategy-inner {
		min-width: calc(100vw - 20rem);
		overflow-y: auto;
	}

	.strategy-title {
		font-size: 2.125rem;
		font-weight: 800;
	}
</style>
