<script lang="ts">
	import { ChevronLeft, Icon, InformationCircle, Pencil, Share } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import ContainerDetailView from '$lib/components/ContainerDetailView.svelte';
	import ContainerDetailViewTabs from '$lib/components/ContainerDetailViewTabs.svelte';
	import IndicatorDetailView from '$lib/components/IndicatorDetailView.svelte';
	import IndicatorTabs from '$lib/components/IndicatorTabs.svelte';
	import InternalObjectiveDetailView from '$lib/components/InternalObjectiveDetailView.svelte';
	import InternalObjectiveTaskDetailView from '$lib/components/InternalObjectiveTaskDetailView.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import MeasureDetailView from '$lib/components/MeasureDetailView.svelte';
	import MeasureTabs from '$lib/components/MeasureTabs.svelte';
	import MeasureStatusTabs from '$lib/components/MeasureStatusTabs.svelte';
	import PayloadTypeFilter from '$lib/components/PayloadTypeFilter.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import SidebarTab from '$lib/components/SidebarTab.svelte';
	import StrategyDetailView from '$lib/components/StrategyDetailView.svelte';
	import StrategyTabs from '$lib/components/StrategyTabs.svelte';
	import TaskStatusTabs from '$lib/components/TaskStatusTabs.svelte';
	import {
		isContainer,
		isIndicatorContainer,
		isInternalObjectiveContainer,
		isMeasureContainer,
		isOrganizationalUnitContainer,
		isStrategyContainer,
		isTaskContainer,
		payloadTypes
	} from '$lib/models';
	import { ability, applicationState } from '$lib/stores';
	import type { PageData } from './$types';

	export let data: PageData;

	$: container = data.container;
	$: containersWithObjectives = data.containersWithObjectives;
	$: relatedContainers = data.relatedContainers;
	$: revisions = data.revisions;
	$: helpSlug = `${container.payload.type.replace('_', '-')}-view`;
</script>

<Layout>
	<svelte:fragment slot="sidebar">
		{#if isMeasureContainer(data.container)}
			<Sidebar {helpSlug}>
				<MeasureTabs container={data.container} slot="tabs" />
			</Sidebar>
		{:else if isStrategyContainer(data.container)}
			<Sidebar {helpSlug}>
				<StrategyTabs container={data.container} slot="tabs" />
				<PayloadTypeFilter slot="filters" />
			</Sidebar>
		{:else}
			<Sidebar {helpSlug}>
				<svelte:fragment slot="tabs">
					<SidebarTab
						href="/{data.container.payload.type}/{data.container.guid}"
						iconSource={InformationCircle}
						text={$_('information')}
					/>
					<SidebarTab
						href="/{data.container.payload.type}/{data.container.guid}/relations"
						iconSource={Share}
						text={$_('relations')}
					/>
				</svelte:fragment>
			</Sidebar>
		{/if}
	</svelte:fragment>

	<svelte:fragment slot="main">
		<div class="overlay-support">
			<div class="detail-page-content overlay-support-inner">
				{#if isStrategyContainer(container)}
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
				{:else}
					<header class="content-header">
						<h2>
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
						{#if isIndicatorContainer(container)}
							<IndicatorTabs />
						{:else if isMeasureContainer(container)}
							<MeasureStatusTabs {container} {revisions} />
						{:else if isTaskContainer(container)}
							<TaskStatusTabs {container} {revisions} />
						{/if}
					</header>
					<div class="content-details masked-overflow">
						{#if $applicationState.containerDetailView.tabs.length > 0}
							<aside>
								<ContainerDetailViewTabs {container} />
							</aside>
						{/if}
						{#if isIndicatorContainer(container)}
							<IndicatorDetailView
								{container}
								{containersWithObjectives}
								{relatedContainers}
								{revisions}
							/>
						{:else if isMeasureContainer(container)}
							<MeasureDetailView {container} {relatedContainers} {revisions} />
						{:else if isTaskContainer(container)}
							<InternalObjectiveTaskDetailView {container} {relatedContainers} {revisions} />
						{:else if isInternalObjectiveContainer(container)}
							<InternalObjectiveDetailView {container} {relatedContainers} {revisions} />
						{:else if isOrganizationalUnitContainer(container)}
							<ContainerDetailView {container} {relatedContainers} {revisions} />
						{:else if isContainer(container)}
							<ContainerDetailView {container} {relatedContainers} {revisions} />
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</svelte:fragment>
</Layout>

<style>
	.overlay-support {
		flex: 1 1;
		overflow-x: auto;
	}

	.overlay-support-inner {
		min-width: calc(100vw - 20rem);
		overflow-y: auto;
	}

	.strategy-title {
		font-size: 2.125rem;
		font-weight: 800;
	}
</style>
