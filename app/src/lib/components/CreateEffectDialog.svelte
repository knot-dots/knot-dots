<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import { _ } from 'svelte-i18n';
	import ChevronDoubleRight from '~icons/flowbite/chevron-double-right-outline';
	import { beforeNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { filterCategoryContext } from '$lib/categoryOptions';
	import createEffect, { CreateEffectError } from '$lib/client/createEffect';
	import BooleanValueToggle from '$lib/components/BooleanValueToggle.svelte';
	import Editor from '$lib/components/Editor.svelte';
	import EditableTendency from '$lib/components/EditableTendency.svelte';
	import IndicatorSuggestionPicker from '$lib/components/IndicatorSuggestionPicker.svelte';
	import IndicatorUnitDropdown from '$lib/components/IndicatorUnitDropdown.svelte';
	import PlannedValuesEditor from '$lib/components/PlannedValuesEditor.svelte';
	import SingleChoiceDropdown from '$lib/components/SingleChoiceDropdown.svelte';
	import { getCreateEffectDialogContext } from '$lib/contexts/createEffectDialog.svelte';
	import {
		type CreatedEffect,
		type EffectKind,
		effectKindOptions,
		effectKinds,
		effectValue,
		type EffectValue,
		newIndicatorForEffect
	} from '$lib/effectCreation';
	import { createFeatureDecisions } from '$lib/features';
	import {
		type BinaryIndicatorPayload,
		type Container,
		type IndicatorPayload,
		isIndicatorContainer,
		payloadTypes
	} from '$lib/models';
	import { mayCreateContainer } from '$lib/stores';

	const dialogContext = getCreateEffectDialogContext();

	// The dialog is mounted for a request and unmounted when it closes, so the
	// request is fixed for its lifetime and every draft starts empty.
	const { iooiType, onCreated, target } = dialogContext.request!;

	let dialog: HTMLDialogElement;

	let step = $state<1 | 2>(1);

	let selection = $state.raw<
		| {
				kind: 'existing';
				indicator: Container<BinaryIndicatorPayload> | Container<IndicatorPayload>;
		  }
		| { kind: 'new' }
	>();

	let description = $state('');

	let chosenKind = $state<EffectKind>();

	let title = $state('');

	let unit = $state('');

	let draft = $state<{ payload: { trendValue?: 1 | -1; type: typeof payloadTypes.enum.effect } }>({
		payload: { type: payloadTypes.enum.effect }
	});

	let booleanValue = $state(true);

	let plannedValues = $state<Array<[number, number]>>([[new Date().getFullYear(), 0]]);

	let submitting = $state(false);

	let errorMessage = $state<string>();

	let scope = $derived(page.data.currentOrganizationalUnit ?? page.data.currentOrganization);

	let mayCreateIndicator = $derived($mayCreateContainer(payloadTypes.enum.indicator, scope));

	let mayCreateBinaryIndicator = $derived(
		$mayCreateContainer(payloadTypes.enum.binary_indicator, scope)
	);

	let kindOptions = $derived(
		effectKindOptions({
			features: page.data.features,
			indicatorType: selection?.kind === 'existing' ? selection.indicator.payload.type : undefined,
			mayCreateBinaryIndicator
		})
	);

	let kind = $derived(
		kindOptions.length === 1
			? kindOptions[0]
			: chosenKind && kindOptions.includes(chosenKind)
				? chosenKind
				: undefined
	);

	let value = $derived.by((): EffectValue | undefined => {
		switch (kind) {
			case effectKinds.enum.tendency:
				return draft.payload.trendValue
					? { kind, trendValue: draft.payload.trendValue }
					: undefined;
			case effectKinds.enum.series:
				return { kind, plannedValues };
			case effectKinds.enum.binary:
				return { kind, booleanValue };
			default:
				return undefined;
		}
	});

	let shownUnit = $derived(
		selection?.kind === 'existing'
			? isIndicatorContainer(selection.indicator)
				? selection.indicator.payload.unit
				: undefined
			: kind === effectKinds.enum.binary
				? undefined
				: unit
	);

	let isValidValue = $derived(value !== undefined && effectValue.safeParse(value).success);

	let canSubmit = $derived(
		description.trim() !== '' &&
			isValidValue &&
			(selection?.kind === 'existing' ||
				(title.trim() !== '' && (kind === effectKinds.enum.binary || unit !== '')))
	);

	const showModal: Attachment<HTMLDialogElement> = (element) => {
		element.showModal();
	};

	beforeNavigate(() => {
		dialog?.close();
	});

	function select(indicator: Container<BinaryIndicatorPayload> | Container<IndicatorPayload>) {
		selection = { kind: 'existing', indicator };
		step = 2;
	}

	function createNew() {
		selection = { kind: 'new' };
		step = 2;
	}

	async function submit() {
		if (step !== 2 || !canSubmit || submitting || !selection || !value || !kind) {
			return;
		}

		submitting = true;
		errorMessage = undefined;

		let created: CreatedEffect;
		try {
			created = await createEffect(target, {
				description,
				indicator:
					selection.kind === 'existing'
						? { kind: 'existing', container: selection.indicator }
						: {
								kind: 'new',
								container: newIndicatorForEffect({
									categoryKeys: filterCategoryContext(page.data.categoryContext, [
										payloadTypes.enum.indicator
									]).keys,
									kind,
									scope,
									target,
									title: title.trim(),
									unit
								})
							},
				iooiType,
				value
			});
		} catch (caught) {
			// Validation errors carry no message meant for users.
			errorMessage =
				caught instanceof CreateEffectError && caught.status !== 422 && caught.message
					? caught.message
					: $_('create_effect_dialog.error.save_failed');
			submitting = false;
			return;
		}

		// The effect exists now, so the dialog closes even if handling it fails.
		submitting = false;
		dialog.close();
		onCreated?.(created);
	}
</script>

<dialog
	aria-labelledby="create-effect-dialog-title"
	bind:this={dialog}
	{@attach showModal}
	oncancel={(event) => {
		if (submitting) {
			event.preventDefault();
		}
	}}
	onclose={() => dialogContext.close()}
	oninput={(event) => event.stopPropagation()}
>
	<form
		onsubmit={(event) => {
			event.preventDefault();
			submit();
		}}
	>
		<nav>
			<h2 class="is-visually-hidden" id="create-effect-dialog-title">
				{$_('create_effect_dialog.title')}
			</h2>
			<ol class="step-navigation">
				<li class:active={step === 1}>
					{$_('create_effect_dialog.step.select_indicator')}
					<ChevronDoubleRight />
				</li>
				<li class:active={step === 2}>
					{$_('create_effect_dialog.step.define_effect')}
				</li>
			</ol>

			{#if step === 2}
				<button class="button-xs" disabled={submitting} onclick={() => (step = 1)} type="button">
					{$_('back')}
				</button>
			{/if}

			<button
				class="button-primary button-xs system-danger"
				disabled={submitting}
				onclick={() => dialog.close()}
				type="button"
			>
				{$_('cancel')}
			</button>

			{#if step === 2}
				<button
					class="button-primary button-xs system-primary"
					disabled={!canSubmit || submitting}
					type="submit"
				>
					{$_('create_effect_dialog.button.confirm')}
				</button>
			{/if}
		</nav>

		{#if step === 1}
			<IndicatorSuggestionPicker
				includeBinaryIndicators={createFeatureDecisions(page.data.features).useBinaryIndicators()}
				onCreateNew={mayCreateIndicator ? createNew : undefined}
				onSelect={select}
				purpose="effect"
				{target}
			/>
		{:else if selection}
			<div class="definition">
				{#if errorMessage}
					<p class="error" role="alert">{errorMessage}</p>
				{/if}

				<div class="details-section description">
					<Editor label={$_('description')} bind:value={description} />
					{#if description.trim() === ''}
						<p class="hint">{$_('create_effect_dialog.description_hint')}</p>
					{/if}
				</div>

				<div class="properties">
					<span class="label" id="create-effect-dialog-kind">
						{$_('create_effect_dialog.effect_kind')}
					</span>
					{#if kindOptions.length > 1}
						<SingleChoiceDropdown
							labelledBy="create-effect-dialog-kind"
							options={kindOptions.map((o) => ({
								label: $_(`create_effect_dialog.effect_kind.${o}`),
								value: o
							}))}
							bind:value={chosenKind}
						/>
					{:else if kind}
						<span class="value">{$_(`create_effect_dialog.effect_kind.${kind}`)}</span>
					{/if}

					{#if kind && kind !== effectKinds.enum.binary}
						<span class="label" id="create-effect-dialog-unit">{$_('unit')}</span>
						{#if selection.kind === 'new'}
							<IndicatorUnitDropdown
								editable
								labelledBy="create-effect-dialog-unit"
								bind:value={unit}
							/>
						{:else}
							<span class="value">{shownUnit ? $_(shownUnit) : ''}</span>
						{/if}
					{/if}
				</div>

				{#if kind}
					<div class="preview">
						{#if selection.kind === 'existing'}
							<h3>{selection.indicator.payload.title}</h3>
						{:else}
							<label class="title">
								<span class="is-visually-hidden">{$_('title')}</span>
								<input bind:value={title} placeholder={$_('title')} required type="text" />
							</label>
							{#if title.trim() === ''}
								<p class="hint">{$_('create_effect_dialog.title_hint')}</p>
							{/if}
						{/if}

						<h4>
							{$_(`create_effect_dialog.effect_kind.${kind}`)}
							{#if shownUnit}<small>{$_(shownUnit)}</small>{/if}
						</h4>

						{#if kind === effectKinds.enum.tendency}
							<EditableTendency container={draft} editable />
						{:else if kind === effectKinds.enum.series}
							<PlannedValuesEditor bind:value={plannedValues} />
							{#if !isValidValue}
								<p class="hint">{$_('create_effect_dialog.planned_values_hint')}</p>
							{/if}
						{:else}
							<BooleanValueToggle bind:checked={booleanValue} />
						{/if}
					</div>
				{/if}
			</div>
		{/if}
	</form>
</dialog>

<style>
	dialog {
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
		border-color: var(--color-gray-400);
		color: var(--color-gray-400);
	}

	.step-navigation > li > :global(svg) {
		color: var(--color-gray-400);
		display: inline-block;
		height: 1.5rem;
		margin-left: 0.375rem;
		width: 1.5rem;
	}

	.definition {
		align-self: center;
		background: var(--color-white);
		border: 1px solid var(--color-gray-200);
		border-radius: 16px;
		box-shadow: var(--shadow-sm);
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		max-width: 48rem;
		overflow-y: auto;
		padding: 2rem 2.5rem;
		width: 100%;
	}

	.properties {
		align-items: center;
		display: grid;
		gap: 1rem;
		grid-template-columns: 12rem 1fr;
	}

	.label {
		color: var(--color-gray-500);
		font-size: 0.875rem;
	}

	.value {
		color: var(--color-gray-900);
	}

	.hint {
		background-color: var(--color-yellow-050);
		border: solid 1px var(--color-yellow-200);
		border-radius: 8px;
		color: var(--color-yellow-900);
		font-size: 0.875rem;
		margin-top: 0.5rem;
		padding: 0.375rem 0.75rem;
		width: fit-content;
	}

	.error {
		background-color: var(--color-red-050);
		border: solid 1px var(--color-red-200);
		border-radius: 8px;
		color: var(--color-red-900);
		padding: 0.5rem 0.75rem;
	}

	.preview {
		background-color: var(--color-teal-050);
		border: solid 1px var(--color-teal-100);
		border-radius: 8px;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1rem;
	}

	.preview h3,
	.preview .title input {
		color: var(--color-gray-900);
		font-size: 1.75rem;
		font-weight: 700;
		margin: 0;
	}

	.preview .title input {
		background-color: transparent;
		border: none;
		padding: 0;
		width: 100%;
	}

	.preview h4 {
		align-items: baseline;
		color: var(--color-gray-900);
		display: flex;
		font-size: 1.25rem;
		gap: 0.5rem;
		margin: 0;
	}

	.preview h4 small {
		color: var(--color-gray-500);
		font-size: 1rem;
		font-weight: 400;
	}
</style>
