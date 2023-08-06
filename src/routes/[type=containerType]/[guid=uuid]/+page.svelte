<script lang="ts">
	import { ChevronLeft, Icon, Pencil } from 'svelte-hero-icons';
	import ContainerDetailView from '$lib/components/ContainerDetailView.svelte';
	import InternalObjectiveDetailView from '$lib/components/InternalObjectiveDetailView.svelte';
	import StrategyDetailView from '$lib/components/StrategyDetailView.svelte';
	import StrategyOverlay from '$lib/components/StrategyOverlay.svelte';
	import {
		isContainer,
		isInternalObjectiveContainer,
		isMeasureContainer,
		isStrategyContainer,
		isTaskContainer
	} from '$lib/models';
	import { user } from '$lib/stores';
	import type { PageData } from './$types';
	import MeasureDetailView from '$lib/components/MeasureDetailView.svelte';
	import InternalObjectiveTaskDetailView from '$lib/components/InternalObjectiveTaskDetailView.svelte';

	export let data: PageData;

	$: container = data.container;
	$: relatedContainers = data.relatedContainers;
	$: revisions = data.revisions;
</script>

{#if isStrategyContainer(container)}
	<StrategyDetailView {container} {relatedContainers} {revisions} />
	{#if data.strategyOverlayData}
		<StrategyOverlay {...data.strategyOverlayData} />
	{/if}
{:else if isMeasureContainer(container)}
	<MeasureDetailView {container} {relatedContainers} {revisions}>
		<svelte:fragment slot="header">
			<h2>
				{container.payload.title}
				<div class="icons">
					{#if $user.isAuthenticated}
						<a href="{container.guid}/edit" class="icons-element">
							<Icon solid src={Pencil} size="20" />
						</a>
					{/if}
					<button class="icons-element" type="button" on:click={() => window.history.back()}>
						<Icon solid src={ChevronLeft} size="20" />
					</button>
				</div>
			</h2>
		</svelte:fragment>
	</MeasureDetailView>
{:else if isTaskContainer(container)}
	<InternalObjectiveTaskDetailView {container} {relatedContainers} {revisions}>
		<svelte:fragment slot="header">
			<h2>
				{container.payload.title}
				<div class="icons">
					{#if $user.isAuthenticated}
						<a href="{container.guid}/edit" class="icons-element">
							<Icon solid src={Pencil} size="20" />
						</a>
					{/if}
					<button class="icons-element" type="button" on:click={() => window.history.back()}>
						<Icon solid src={ChevronLeft} size="20" />
					</button>
				</div>
			</h2>
		</svelte:fragment>
	</InternalObjectiveTaskDetailView>
{:else if isInternalObjectiveContainer(container)}
	<InternalObjectiveDetailView {container} {relatedContainers} {revisions}>
		<svelte:fragment slot="header">
			<h2>
				{container.payload.title}
				<div class="icons">
					{#if $user.isAuthenticated}
						<a href="{container.guid}/edit" class="icons-element">
							<Icon solid src={Pencil} size="20" />
						</a>
					{/if}
					<button class="icons-element" type="button" on:click={() => window.history.back()}>
						<Icon solid src={ChevronLeft} size="20" />
					</button>
				</div>
			</h2>
		</svelte:fragment>
	</InternalObjectiveDetailView>
{:else if isContainer(container)}
	<ContainerDetailView {container} {relatedContainers} {revisions}>
		<svelte:fragment slot="header">
			<h2>
				{container.payload.title}
				<div class="icons">
					{#if $user.isAuthenticated}
						<a href="{container.guid}/edit" class="icons-element">
							<Icon solid src={Pencil} size="20" />
						</a>
					{/if}
					<button class="icons-element" type="button" on:click={() => window.history.back()}>
						<Icon solid src={ChevronLeft} size="20" />
					</button>
				</div>
			</h2>
		</svelte:fragment>
	</ContainerDetailView>
{/if}
