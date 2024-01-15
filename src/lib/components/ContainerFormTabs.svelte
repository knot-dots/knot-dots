<script lang="ts">
	import { _ } from 'svelte-i18n';
	import {
		CurrencyEuro,
		Icon,
		InformationCircle,
		PuzzlePiece,
		QuestionMarkCircle,
		Sparkles,
		TableCells
	} from 'svelte-hero-icons';
	import { page } from '$app/stores';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import { boards, isMeasureContainer } from '$lib/models';
	import type { AnyContainer, ContainerFormTabKey, PayloadType } from '$lib/models';
	import { applicationState, getOrganization, getOrganizationalUnit } from '$lib/stores';

	export let container: AnyContainer;

	let showEffectsTab: boolean;

	$: {
		const organizationOrOrganizationalUnit = container.organizational_unit
			? $getOrganizationalUnit(container.organizational_unit)
			: $getOrganization(container.organization);

		showEffectsTab =
			isMeasureContainer(container) &&
			organizationOrOrganizationalUnit?.payload.boards.includes(boards.enum['board.indicators']);
	}

	function updateApplicationState(activeTab: ContainerFormTabKey) {
		applicationState.update((state) => ({
			...state,
			containerForm: { ...state.containerForm, activeTab }
		}));
	}

	function helpURL(url: URL, payloadType: PayloadType) {
		const hashParams = paramsFromURL(url);
		hashParams.set('view-help', `${payloadType.replace('_', '-')}-edit`);
		return `#${hashParams.toString()}`;
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
	{#if $applicationState.containerForm.tabs.includes('historical-values')}
		<li>
			<button
				title={$_('form.historical_values')}
				type="button"
				class:is-active={$applicationState.containerForm.activeTab === 'historical-values'}
				on:click={() => updateApplicationState('historical-values')}
			>
				<Icon src={TableCells} size="20" mini />
			</button>
		</li>
	{/if}
	<li>
		<a class="button" href={helpURL($page.url, container.payload.type)} title={$_('help')}>
			<Icon src={QuestionMarkCircle} size="20" mini />
		</a>
	</li>
</ul>

<style>
	ul {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	button,
	.button {
		--padding-x: 12px;
		--padding-y: 12px;
	}
</style>
