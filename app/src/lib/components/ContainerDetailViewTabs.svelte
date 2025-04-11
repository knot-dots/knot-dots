<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Info from '~icons/knotdots/info';
	import Effects from '~icons/knotdots/effects';
	import Milestones from '~icons/knotdots/milestones';
	import PuzzlePiece from '~icons/heroicons/puzzle-piece-20-solid';
	import Resources from '~icons/knotdots/resources';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { createFeatureDecisions } from '$lib/features';
	import { isContainerWithEffect } from '$lib/models';
	import type { AnyContainer, ContainerDetailViewTabKey } from '$lib/models';
	import { applicationState } from '$lib/stores';

	export let container: AnyContainer;

	$: showEffectsTab = isContainerWithEffect(container);

	$: showResourcesTab = isContainerWithEffect(container);

	function updateApplicationState(activeTab: ContainerDetailViewTabKey) {
		applicationState.update((state) => ({
			...state,
			containerDetailView: { ...state.containerDetailView, activeTab }
		}));
		if (browser) {
			const element = document.getElementById(activeTab);
			if (element) {
				element.scrollIntoView({ behavior: 'smooth' });
			}
		}
	}
</script>

{#if $applicationState.containerDetailView.tabs.includes('basic-data')}
	<li>
		<button
			title={$_('form.basic_data')}
			type="button"
			class="button-nav button-square"
			on:click={() => updateApplicationState('basic-data')}
		>
			<Info />
		</button>
	</li>
{/if}
{#if $applicationState.containerDetailView.tabs.includes('resources') && showResourcesTab}
	<li>
		<button
			title={$_('form.resources')}
			type="button"
			class="button-nav button-square"
			on:click={() => updateApplicationState('resources')}
		>
			<Resources />
		</button>
	</li>
{/if}
{#if $applicationState.containerDetailView.tabs.includes('effects') && showEffectsTab}
	<li>
		<button
			title={$_('form.effects')}
			type="button"
			class="button-nav button-square"
			on:click={() => updateApplicationState('effects')}
		>
			<Effects />
		</button>
	</li>
{/if}
{#if $applicationState.containerDetailView.tabs.includes('milestones')}
	<li>
		<button
			title={$_('milestones')}
			type="button"
			class="button-nav button-square"
			on:click={() => updateApplicationState('milestones')}
		>
			<Milestones />
		</button>
	</li>
{/if}
{#if $applicationState.containerDetailView.tabs.includes('metadata') && !createFeatureDecisions(page.data.features).useEditableDetailView()}
	<li>
		<button
			title={$_('form.metadata')}
			type="button"
			class="button-nav button-square"
			on:click={() => updateApplicationState('metadata')}
		>
			<PuzzlePiece />
		</button>
	</li>
{/if}
