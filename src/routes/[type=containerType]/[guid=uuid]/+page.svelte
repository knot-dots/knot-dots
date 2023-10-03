<script lang="ts">
	import { ChevronLeft, Icon, Pencil } from 'svelte-hero-icons';
	import ContainerDetailView from '$lib/components/ContainerDetailView.svelte';
	import InternalObjectiveDetailView from '$lib/components/InternalObjectiveDetailView.svelte';
	import InternalObjectiveTaskDetailView from '$lib/components/InternalObjectiveTaskDetailView.svelte';
	import MeasureDetailView from '$lib/components/MeasureDetailView.svelte';
	import StrategyDetailView from '$lib/components/StrategyDetailView.svelte';
	import StrategyOverlay from '$lib/components/StrategyOverlay.svelte';
	import {
		isContainer,
		isEmptyOrganizationalUnitContainer,
		isInternalObjectiveContainer,
		isMeasureContainer,
		isStrategyContainer,
		isTaskContainer
	} from '$lib/models';
	import { ability } from '$lib/stores';
	import type { PageData } from './$types';

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
					{#if $ability.can('update', container)}
						<a href="{container.guid}/edit" class="icons-element" data-sveltekit-replacestate>
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
					{#if $ability.can('update', container)}
						<a href="{container.guid}/edit" class="icons-element" data-sveltekit-replacestate>
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
					{#if $ability.can('update', container)}
						<a href="{container.guid}/edit" class="icons-element" data-sveltekit-replacestate>
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
{:else if isEmptyOrganizationalUnitContainer(container)}
	<ContainerDetailView {container} {relatedContainers} {revisions}>
		<svelte:fragment slot="header">
			<h2>
				{container.payload.name}
				<div class="icons">
					{#if $ability.can('update', container)}
						<a href="{container.guid}/edit" class="icons-element" data-sveltekit-replacestate>
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
{:else if isContainer(container)}
	<ContainerDetailView {container} {relatedContainers} {revisions}>
		<svelte:fragment slot="header">
			<h2>
				{container.payload.title}
				<div class="icons">
					{#if $ability.can('update', container)}
						<a href="{container.guid}/edit" class="icons-element" data-sveltekit-replacestate>
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
