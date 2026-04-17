<script lang="ts">
	import { resource } from 'runed';
	import type { Snippet } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import { _ } from 'svelte-i18n';
	import ChevronDoubleRight from '~icons/flowbite/chevron-double-right-outline';
	import { pushState } from '$app/navigation';
	import { page } from '$app/state';
	import fetchRelatedContainers from '$lib/client/fetchRelatedContainers';
	import createEffect from '$lib/client/createEffect';
	import createObjective from '$lib/client/createObjective';
	import EditableEffectDetailView from '$lib/components/EditableEffectDetailView.svelte';
	import EditableObjectiveDetailView from '$lib/components/EditableObjectiveDetailView.svelte';
	import IndicatorTemplatePicker from '$lib/components/IndicatorTemplatePicker.svelte';
	import IndicatorTemplatePreview from '$lib/components/IndicatorTemplatePreview.svelte';
	import NewIndicatorChart from '$lib/components/NewIndicatorChart.svelte';
	import {
		type EffectContainer,
		type IndicatorTemplateContainer,
		isEffectContainer,
		isObjectiveContainer,
		type ObjectiveContainer
	} from '$lib/models';
	import { addEffectState, addObjectiveState } from '$lib/stores';

	interface Props {
		dialog: HTMLDialogElement;
	}

	let { dialog = $bindable() }: Props = $props();

	let target = $derived($addEffectState.target ?? $addObjectiveState.target);

	let selected = $state<IndicatorTemplateContainer>();

	const actualDataResource = resource([() => selected?.guid], async ([guid], _, { signal }) => {
		if (!guid) {
			return [];
		}

		return fetchRelatedContainers(
			guid,
			{
				organization: [page.data.currentOrganization.guid],
				...(page.data.currentOrganizationalUnit
					? { organizationalUnit: [page.data.currentOrganizationalUnit.guid] }
					: undefined)
			},
			'alpha',
			{ signal }
		);
	});

	function handleSelect(value: IndicatorTemplateContainer) {
		selected = value;
		pushState('', { createObjectiveOrEffect: { step: 2 } });
	}

	let newObjectiveOrEffect = $state<EffectContainer | ObjectiveContainer>();

	async function handleConfirm() {
		if (selected) {
			if ($addEffectState.target) {
				newObjectiveOrEffect = await createEffect(
					$addEffectState.target,
					selected,
					$addEffectState.iooiType
				);
				pushState(page.url, { createObjectiveOrEffect: { step: 3 } });
			} else if ($addObjectiveState.target) {
				newObjectiveOrEffect = await createObjective(
					$addObjectiveState.target,
					selected,
					$addObjectiveState.iooiType
				);
				pushState(page.url, { createObjectiveOrEffect: { step: 3 } });
			}
		}
	}

	const initDialog: Attachment<HTMLDialogElement> = (element) => {
		element.showModal();
	};

	function onclose() {
		pushState(page.url, {});
		newObjectiveOrEffect = undefined;
		selected = undefined;
	}
</script>

{#if page.state.createObjectiveOrEffect}
	<dialog {@attach initDialog} bind:this={dialog} {onclose} oninput={(e) => e.stopPropagation()}>
		<form method="dialog">
			<nav>
				<ol class="step-navigation">
					<li class:active={page.state.createObjectiveOrEffect.step === 1}>
						{$_('create_effect_dialog.step.select_indicator')}
						<ChevronDoubleRight />
					</li>
					<li class:active={page.state.createObjectiveOrEffect.step === 2}>
						{$_('create_effect_dialog.step.confirm_selection')}
						<ChevronDoubleRight />
					</li>
					<li class:active={page.state.createObjectiveOrEffect.step === 3}>
						{#if newObjectiveOrEffect && isEffectContainer(newObjectiveOrEffect)}
							{$_('create_effect_dialog.step.define_effect')}
						{:else}
							{$_('create_effect_dialog.step.define_objective')}
						{/if}
					</li>
				</ol>

				<button class="button-xs button-red" onclick={() => dialog.close()} type="button">
					{$_('cancel')}
				</button>

				{#if page.state.createObjectiveOrEffect.step === 2}
					<button class="button-primary button-xs" onclick={() => handleConfirm()} type="button">
						{$_('create_effect_dialog.button.confirm')}
					</button>
				{:else if page.state.createObjectiveOrEffect.step === 3}
					<button class="button-primary button-xs" onclick={() => dialog.close()} type="button">
						{$_('create_effect_dialog.button.confirm')}
					</button>
				{/if}
			</nav>

			{#if page.state.createObjectiveOrEffect.step === 1 && target}
				<IndicatorTemplatePicker onSelect={handleSelect} {target} value={selected} />
			{:else if page.state.createObjectiveOrEffect.step === 2 && selected}
				<IndicatorTemplatePreview container={selected} />
			{:else if page.state.createObjectiveOrEffect.step === 3 && newObjectiveOrEffect}
				<div class="step-3-layout">
					{#if selected && actualDataResource.current}
						<div class="step-3-layout-left">
							<NewIndicatorChart
								container={selected}
								relatedContainers={actualDataResource.current}
							/>
						</div>
					{/if}

					<div class="step-3-layout-right">
						{#if isEffectContainer(newObjectiveOrEffect)}
							<EditableEffectDetailView
								bind:container={newObjectiveOrEffect}
								revisions={[newObjectiveOrEffect]}
							>
								<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
								{#snippet layout(header: Snippet, main: Snippet)}
									{@render main()}
								{/snippet}
							</EditableEffectDetailView>
						{:else if isObjectiveContainer(newObjectiveOrEffect)}
							<EditableObjectiveDetailView
								bind:container={newObjectiveOrEffect}
								revisions={[newObjectiveOrEffect]}
							>
								<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
								{#snippet layout(header: Snippet, main: Snippet)}
									{@render main()}
								{/snippet}
							</EditableObjectiveDetailView>
						{/if}
					</div>
				</div>
			{/if}
		</form>
	</dialog>
{/if}

<style>
	dialog {
		--details-padding-x: calc(50% - var(--details-max-width) / 2);
		--details-padding-y: 0;

		background-color: var(--color-gray-025);
		border: solid 1px var(--color-gray-200);
		border-radius: 8px;
		box-shadow: var(--shadow-2xl);
		color: var(--color-gray-500);
		container-type: inline-size;
		height: calc(100vh - 3rem);
		padding: 1.5rem;
		width: min(calc(100vw - 10rem), var(--details-max-width) + 20rem);
	}

	form {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	nav {
		align-items: center;
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.step-navigation {
		counter-reset: steps;
		display: flex;
		font-size: 0.875rem;
		margin-right: auto;
	}

	.step-navigation > li {
		align-items: center;
		color: var(--color-gray-700);
		display: flex;
	}

	.step-navigation > li:before {
		border: solid 1px var(--color-gray-700);
		border-radius: calc(infinity * 1px);
		content: counter(steps);
		counter-increment: steps;
		display: inline-block;
		flex-shrink: 0;
		font-size: 0.75rem;
		height: 1.25rem;
		margin: 0 0.375rem;
		text-align: center;
		width: 1.25rem;
	}

	.step-navigation > li.active:before {
		background-color: var(--color-gray-900);
		border-color: var(--color-gray-900);
		color: var(--color-white);
	}

	.step-navigation > li.active ~ li {
		color: var(--color-gray-400);
	}

	.step-navigation > li.active ~ li:before {
		border-color: var(--color-gray400);
		color: var(--color-gray-400);
	}

	.step-navigation > li > :global(svg) {
		color: var(--color-gray-400);
		display: inline-block;
		height: 1.5rem;
		margin-left: 0.375rem;
		width: 1.5rem;
	}

	.button-red {
		--button-background: transparent;

		border: solid 1px var(--color-red-700);
		color: var(--color-red-700);
	}

	.button-red:active,
	.button-red:hover {
		color: var(--color-white);
	}

	.step-3-layout {
		align-items: flex-start;
		container-type: inline-size;
		display: flex;
		flex-direction: column-reverse;
		gap: 1rem;
		overflow-y: auto;
	}

	.step-3-layout > * {
		background: var(--color-white);
		border-radius: 8px;
		border: 1px solid var(--color-gray-200);
		box-shadow: var(--shadow-sm);
		padding: 1rem;
		width: 100%;
	}

	.step-3-layout :global(footer),
	.step-3-layout :global(aside) {
		display: none;
	}

	@container (width > 46rem) {
		.step-3-layout {
			flex-direction: row;
		}

		.step-3-layout > * {
			width: auto;
		}

		.step-3-layout > .step-3-layout-left {
			flex-grow: 0;
			flex-basis: 20rem;
		}

		.step-3-layout > .step-3-layout-right {
			flex-grow: 1;
		}
	}
</style>
