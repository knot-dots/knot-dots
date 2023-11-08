<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { CurrencyEuro, Icon, InformationCircle, PuzzlePiece, Sparkles } from 'svelte-hero-icons';
	import { isMeasureContainer, predicates } from '$lib/models';
	import type { AnyContainer, ContainerFormTabKey } from '$lib/models';
	import { applicationState } from '$lib/stores';

	export let container: AnyContainer;
	export let isPartOfOptions: AnyContainer[];

	$: showEffectsTab =
		isMeasureContainer(container) &&
		isPartOfOptions.find(
			(o) =>
				container.relation.findIndex(
					(r) => r.predicate === predicates.enum['is-part-of'] && r.object === o.revision
				) > -1 &&
				'indicator' in o.payload &&
				o.payload.indicator.length > 0 &&
				'quantity' in o.payload.indicator[0]
		);

	function updateApplicationState(activeTab: ContainerFormTabKey) {
		applicationState.update((state) => ({
			...state,
			containerForm: { ...state.containerForm, activeTab }
		}));
	}
</script>

<ul>
	{#if $applicationState.containerForm.tabs.includes('metadata')}
		<li>
			<button
				title={$_('form.metadata')}
				type="button"
				class:is-active={$applicationState.containerForm.activeTab === 'metadata'}
				on:click={() => updateApplicationState('metadata')}
			>
				<Icon src={PuzzlePiece} size="20" mini />
			</button>
		</li>
	{/if}
	{#if $applicationState.containerForm.tabs.includes('basic-data')}
		<li>
			<button
				title={$_('form.basic_data')}
				type="button"
				class:is-active={$applicationState.containerForm.activeTab === 'basic-data'}
				on:click={() => updateApplicationState('basic-data')}
			>
				<Icon src={InformationCircle} size="20" mini />
			</button>
		</li>
	{/if}
	{#if $applicationState.containerForm.tabs.includes('resources')}
		<li>
			<button
				title={$_('form.resources')}
				type="button"
				class:is-active={$applicationState.containerForm.activeTab === 'resources'}
				on:click={() => updateApplicationState('resources')}
			>
				<Icon src={CurrencyEuro} size="20" mini />
			</button>
		</li>
	{/if}
	{#if $applicationState.containerForm.tabs.includes('effects') && showEffectsTab}
		<li>
			<button
				title={$_('form.effects')}
				type="button"
				class:is-active={$applicationState.containerForm.activeTab === 'effects'}
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
