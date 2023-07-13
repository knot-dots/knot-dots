<script lang="ts">
	import { ChevronLeft, Icon, Pencil } from 'svelte-hero-icons';
	import ContainerDetailView from '$lib/components/ContainerDetailView.svelte';
	import StrategyDetailView from '$lib/components/StrategyDetailView.svelte';
	import StrategyOverlay from '$lib/components/StrategyOverlay.svelte';
	import { isStrategyContainer } from '$lib/models';
	import { user } from '$lib/stores';
	import type { PageData } from './$types';

	export let data: PageData;

	$: container = data.container;
	$: relatedContainers = data.relatedContainers;
</script>

{#if isStrategyContainer(container)}
	<StrategyDetailView {container} relatedContainers={data.relatedContainers} />
	{#if data.strategyOverlayData}
		<StrategyOverlay {...data.strategyOverlayData} />
	{/if}
{:else}
	<ContainerDetailView {container} {relatedContainers}>
		<svelte:fragment slot="header">
			<h2>{container.payload.title}</h2>
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
		</svelte:fragment>
	</ContainerDetailView>
{/if}
