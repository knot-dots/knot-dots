<script lang="ts">
	import {
		CurrencyEuro,
		Icon,
		InformationCircle,
		PuzzlePiece,
		QuestionMarkCircle,
		Sparkles,
		TableCells
	} from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import {
		type AnyContainer,
		boards,
		type ContainerDetailViewTabKey,
		type ContainerFormTabKey,
		isContainerWithEffect,
		isPageContainer,
		overlayKey,
		type PayloadType
	} from '$lib/models';
	import { applicationState, getOrganization, getOrganizationalUnit } from '$lib/stores';

	export let container: AnyContainer;

	let showEffectsTab: boolean;

	$: {
		const organizationOrOrganizationalUnit = container.organizational_unit
			? $getOrganizationalUnit(container.organizational_unit)
			: $getOrganization(container.organization);

		showEffectsTab =
			isContainerWithEffect(container) &&
			organizationOrOrganizationalUnit?.payload.boards.includes(boards.enum['board.indicators']);
	}

	function updateContainerFormState(activeTab: ContainerFormTabKey) {
		applicationState.update((state) => ({
			...state,
			containerForm: { ...state.containerForm, activeTab }
		}));
	}

	function updateContainerDetailViewState(activeTab: ContainerDetailViewTabKey) {
		applicationState.update((state) => ({
			...state,
			containerDetailView: { ...state.containerDetailView, activeTab }
		}));
	}

	function helpURL(url: URL, payloadType: PayloadType, mode: 'view' | 'edit') {
		const hashParams = paramsFromURL(url);
		hashParams.set('view-help', `${payloadType.replace('_', '-')}-${mode}`);
		return `#${hashParams.toString()}`;
	}
</script>

<ul class="overlay-deep-links">
	{#if paramsFromURL($page.url).has(overlayKey.enum.edit) || paramsFromURL($page.url).has(overlayKey.enum.create)}
		{#if $applicationState.containerForm.tabs.includes('metadata')}
			<li>
				<button
					title={$_('form.metadata')}
					type="button"
					class="button-nav button-square"
					class:is-active={$applicationState.containerForm.activeTab === 'metadata'}
					on:click={() => updateContainerFormState('metadata')}
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
					class="button-nav button-square"
					class:is-active={$applicationState.containerForm.activeTab === 'basic-data'}
					on:click={() => updateContainerFormState('basic-data')}
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
					class="button-nav button-square"
					class:is-active={$applicationState.containerForm.activeTab === 'resources'}
					on:click={() => updateContainerFormState('resources')}
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
					class="button-nav button-square"
					class:is-active={$applicationState.containerForm.activeTab === 'effects'}
					on:click={() => updateContainerFormState('effects')}
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
					class="button-nav button-square"
					class:is-active={$applicationState.containerForm.activeTab === 'historical-values'}
					on:click={() => updateContainerFormState('historical-values')}
				>
					<Icon src={TableCells} size="20" mini />
				</button>
			</li>
		{/if}
		{#if !isPageContainer(container)}
			<li>
				<a
					class="button button-nav button-square"
					href={helpURL($page.url, container.payload.type, 'edit')}
					title={$_('help')}
				>
					<Icon src={QuestionMarkCircle} size="20" mini />
				</a>
			</li>
		{/if}
	{:else}
		{#if $applicationState.containerDetailView.tabs.includes('basic-data')}
			<li>
				<button
					title={$_('form.basic_data')}
					type="button"
					class="button-nav button-square"
					class:is-active={$applicationState.containerDetailView.activeTab === 'basic-data'}
					on:click={() => updateContainerDetailViewState('basic-data')}
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
					class="button-nav button-square"
					class:is-active={$applicationState.containerDetailView.activeTab === 'resources'}
					on:click={() => updateContainerDetailViewState('resources')}
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
					class="button-nav button-square"
					class:is-active={$applicationState.containerDetailView.activeTab === 'effects'}
					on:click={() => updateContainerDetailViewState('effects')}
				>
					<Icon src={Sparkles} size="20" mini />
				</button>
			</li>
		{/if}

		{#if !isPageContainer(container)}
			<li>
				<a
					class="button button-nav button-square"
					href={helpURL($page.url, container.payload.type, 'view')}
					title={$_('help')}
				>
					<Icon src={QuestionMarkCircle} size="20" mini />
				</a>
			</li>
		{/if}
	{/if}
</ul>

<style>
	ul {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
</style>
