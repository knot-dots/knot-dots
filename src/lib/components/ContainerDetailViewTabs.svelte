<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { CurrencyEuro, Icon, InformationCircle, Sparkles } from 'svelte-hero-icons';
	import { isMeasureContainer } from '$lib/models';
	import type { AnyContainer, ContainerDetailViewTabKey } from '$lib/models';
	import { applicationState } from '$lib/stores';

	export let container: AnyContainer;

	$: showEffectsTab = isMeasureContainer(container) && container.payload.effect.length > 0;

	function updateApplicationState(activeTab: ContainerDetailViewTabKey) {
		applicationState.update((state) => ({
			...state,
			containerDetailView: { ...state.containerDetailView, activeTab }
		}));
	}
</script>

<ul>
	{#if $applicationState.containerDetailView.tabs.includes('basic-data')}
		<li>
			<button
				title={$_('form.basic_data')}
				type="button"
				class:is-active={$applicationState.containerDetailView.activeTab === 'basic-data'}
				on:click={() => updateApplicationState('basic-data')}
			>
				<Icon src={InformationCircle} size="20" mini />
			</button>
		</li>
	{/if}
	{#if $applicationState.containerDetailView.tabs.includes('resources')}
		<li>
			<button
				title={$_('form.resources')}
				type="button"
				class:is-active={$applicationState.containerDetailView.activeTab === 'resources'}
				on:click={() => updateApplicationState('resources')}
			>
				<Icon src={CurrencyEuro} size="20" mini />
			</button>
		</li>
	{/if}
	{#if $applicationState.containerDetailView.tabs.includes('effects') && showEffectsTab}
		<li>
			<button
				title={$_('form.effects')}
				type="button"
				class:is-active={$applicationState.containerDetailView.activeTab === 'effects'}
				on:click={() => updateApplicationState('effects')}
			>
				<Icon src={Sparkles} size="20" mini />
			</button>
		</li>
	{/if}
</ul>

<style>
	ul {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	button {
		--padding-x: 12px;
		--padding-y: 12px;
	}
</style>
