<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import { _ } from 'svelte-i18n';
	import InfoCircleOutline from '~icons/flowbite/info-circle-outline';
	import { beforeNavigate, pushState } from '$app/navigation';
	import { page } from '$app/state';
	import { filterCategoryContext } from '$lib/categoryOptions';
	import createObjectiveOrEffect, {
		CreateObjectiveOrEffectError
	} from '$lib/client/createObjectiveOrEffect';
	import BooleanValueToggle from '$lib/components/BooleanValueToggle.svelte';
	import Editor from '$lib/components/Editor.svelte';
	import EditableTendency from '$lib/components/EditableTendency.svelte';
	import ValueKindOptions from '$lib/components/ValueKindOptions.svelte';
	import YearlyValuesEditor from '$lib/components/YearlyValuesEditor.svelte';
	import IndicatorSuggestionPicker from '$lib/components/IndicatorSuggestionPicker.svelte';
	import IndicatorUnitDropdown from '$lib/components/IndicatorUnitDropdown.svelte';
	import SuggestedIndicatorCard from '$lib/components/SuggestedIndicatorCard.svelte';
	import { getCreateObjectiveOrEffectDialogContext } from '$lib/contexts/createObjectiveOrEffectDialog.svelte';
	import {
		type CreatedObjectiveOrEffect,
		type ValueKind,
		valueKindOptions,
		valueKinds,
		effectValue,
		type EffectValue,
		newIndicatorForObjectiveOrEffect
	} from '$lib/objectiveOrEffectCreation';
	import {
		type ActualDataPayload,
		type BinaryIndicatorPayload,
		type Container,
		type IndicatorPayload,
		isIndicatorContainer,
		payloadTypes
	} from '$lib/models';
	import { mayCreateContainer } from '$lib/stores';

	const dialogContext = getCreateObjectiveOrEffectDialogContext();

	// The dialog is mounted for a request and unmounted when it closes, so the
	// request is fixed for its lifetime and every draft starts empty.
	const { iooiType, onCreated, target } = dialogContext.request!;

	let dialog: HTMLDialogElement;

	let selection = $state.raw<
		| {
				actualData: Container<ActualDataPayload>[];
				kind: 'existing';
				indicator: Container<BinaryIndicatorPayload> | Container<IndicatorPayload>;
				relevance: number;
		  }
		| { kind: 'new' }
	>();

	// The step is kept in the history. Without a selection, which is lost when
	// the dialog is reopened by going forward again, only the first step remains.
	let step = $derived(page.state.createObjectiveOrEffect?.step === 2 && selection ? 2 : 1);

	let description = $state('');

	let chosenKind = $state<ValueKind>();

	let title = $state('');

	let unit = $state('');

	let draft = $state<{ payload: { trendValue?: 1 | -1; type: typeof payloadTypes.enum.effect } }>({
		payload: { type: payloadTypes.enum.effect }
	});

	let booleanValue = $state(true);

	// Each row holds a year with its planned and its achieved value.
	let values = $state<Array<[number, number, number]>>([[new Date().getFullYear(), 0, 0]]);

	let submitting = $state(false);

	let errorMessage = $state<string>();

	let scope = $derived(page.data.currentOrganizationalUnit ?? page.data.currentOrganization);

	let mayCreateIndicator = $derived($mayCreateContainer(payloadTypes.enum.indicator, scope));

	let mayCreateBinaryIndicator = $derived(
		$mayCreateContainer(payloadTypes.enum.binary_indicator, scope)
	);

	let kindOptions = $derived(
		valueKindOptions({
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
			case valueKinds.enum.tendency:
				return draft.payload.trendValue
					? { kind, trendValue: draft.payload.trendValue }
					: undefined;
			case valueKinds.enum.series:
				return {
					kind,
					achievedValues: values.map(([year, , achieved]) => [year, achieved]),
					plannedValues: values.map(([year, planned]) => [year, planned])
				};
			case valueKinds.enum.binary:
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
			: kind === valueKinds.enum.binary
				? undefined
				: unit
	);

	let heading = $derived(
		step === 1
			? $_('create_objective_or_effect_dialog.title.select_indicator')
			: selection?.kind === 'existing'
				? $_('create_objective_or_effect_dialog.title.existing_indicator')
				: $_('create_objective_or_effect_dialog.title.new_indicator')
	);

	let isValidValue = $derived(value !== undefined && effectValue.safeParse(value).success);

	// The description is optional. An existing indicator brings its own title.
	let canSubmit = $derived(
		isValidValue &&
			(selection?.kind === 'existing' ||
				(title.trim() !== '' && (kind === valueKinds.enum.binary || unit !== '')))
	);

	const showModal: Attachment<HTMLDialogElement> = (element) => {
		element.showModal();
	};

	// Leaving the page closes the dialog, but keeps its steps in the history.
	beforeNavigate(({ from, to }) => {
		if (from?.url.href !== to?.url.href) {
			dialogContext.close();
		}
	});

	// Closing the dialog also removes its steps from the history.
	function onclose() {
		const steps = page.state.createObjectiveOrEffect?.step ?? 0;
		dialogContext.close();
		if (steps > 0) {
			history.go(-steps);
		}
	}

	function select(
		indicator: Container<BinaryIndicatorPayload> | Container<IndicatorPayload>,
		{ actualData, relevance }: { actualData: Container<ActualDataPayload>[]; relevance: number }
	) {
		selection = { actualData, kind: 'existing', indicator, relevance };
		pushState('', { createObjectiveOrEffect: { step: 2 } });
	}

	function createNew() {
		selection = { kind: 'new' };
		pushState('', { createObjectiveOrEffect: { step: 2 } });
	}

	async function submit() {
		if (step !== 2 || !canSubmit || submitting || !selection || !value || !kind) {
			return;
		}

		submitting = true;
		errorMessage = undefined;

		let created: CreatedObjectiveOrEffect;
		try {
			created = await createObjectiveOrEffect(target, {
				description,
				indicator:
					selection.kind === 'existing'
						? { kind: 'existing', container: selection.indicator }
						: {
								kind: 'new',
								container: newIndicatorForObjectiveOrEffect({
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
				caught instanceof CreateObjectiveOrEffectError && caught.status !== 422 && caught.message
					? caught.message
					: $_('create_objective_or_effect_dialog.error.save_failed');
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
	aria-labelledby="create-objective-or-effect-dialog-title"
	bind:this={dialog}
	{@attach showModal}
	oncancel={(event) => {
		if (submitting) {
			event.preventDefault();
		}
	}}
	{onclose}
	oninput={(event) => event.stopPropagation()}
>
	<form
		onsubmit={(event) => {
			event.preventDefault();
			submit();
		}}
	>
		<header>
			<h2 class="truncated" id="create-objective-or-effect-dialog-title">{heading}</h2>

			{#if step === 2}
				<button disabled={submitting} onclick={() => history.back()} type="button">
					{$_('back')}
				</button>
			{/if}

			<button disabled={submitting} onclick={() => dialog.close()} type="button">
				{$_('cancel')}
			</button>

			{#if step === 2}
				<button
					class="button-primary system-primary"
					disabled={!canSubmit || submitting}
					type="submit"
				>
					{$_('create_objective_or_effect_dialog.button.confirm')}
				</button>
			{/if}
		</header>

		{#if step === 1}
			<IndicatorSuggestionPicker
				onCreateNew={mayCreateIndicator ? createNew : undefined}
				onSelect={select}
				{target}
			/>
		{:else if selection}
			<div class="step-2">
				{#if selection.kind === 'existing'}
					<div class="chosen-indicator">
						<SuggestedIndicatorCard
							actualData={selection.actualData}
							container={selection.indicator}
							relevance={selection.relevance}
						/>
					</div>
				{/if}
				<div class="definition">
					{#if errorMessage}
						<p class="error" role="alert">{errorMessage}</p>
					{/if}

					<div class="field">
						<p class="property-label" id="create-objective-or-effect-dialog-effect-title">
							{$_('create_objective_or_effect_dialog.effect_title')}
						</p>
						{#if selection.kind === 'existing'}
							<p class="effect-title">{selection.indicator.payload.title}</p>
						{:else}
							<input
								aria-labelledby="create-objective-or-effect-dialog-effect-title"
								bind:value={title}
								class="effect-title"
								placeholder={$_('title')}
								required
								type="text"
							/>
							{#if title.trim() === ''}
								<p class="hint">
									<InfoCircleOutline />{$_('create_objective_or_effect_dialog.title_hint')}
								</p>
							{/if}
						{/if}
					</div>

					<div class="field description">
						<p class="property-label" id="create-objective-or-effect-dialog-description">
							{$_('description')}
						</p>
						<Editor
							labelledBy="create-objective-or-effect-dialog-description"
							placeholder={$_('create_objective_or_effect_dialog.description_placeholder')}
							bind:value={description}
						/>
						{#if description.trim() === ''}
							<p class="hint">
								<InfoCircleOutline />{$_('create_objective_or_effect_dialog.description_hint')}
							</p>
						{/if}
					</div>

					<div class="field">
						<p class="property-label" id="create-objective-or-effect-dialog-kind">
							{$_('create_objective_or_effect_dialog.value_kind')}
						</p>
						<ValueKindOptions
							labelledBy="create-objective-or-effect-dialog-kind"
							options={kindOptions}
							bind:value={() => kind, (option) => (chosenKind = option)}
						/>
					</div>

					{#if kind && kind !== valueKinds.enum.binary}
						<div class="field unit">
							<span class="property-label" id="create-objective-or-effect-dialog-unit"
								>{$_('unit')}</span
							>
							{#if selection.kind === 'new'}
								<IndicatorUnitDropdown
									editable
									labelledBy="create-objective-or-effect-dialog-unit"
									bind:value={unit}
								/>
							{:else}
								<span class="unit-value">
									{shownUnit ? $_(shownUnit) : ''}
								</span>
							{/if}
						</div>
					{/if}

					{#if kind}
						<div class="field">
							<p class="property-label">{$_(`create_objective_or_effect_dialog.value.${kind}`)}</p>
							{#if kind === valueKinds.enum.tendency}
								<div class="tendency">
									<EditableTendency bind:container={draft} editable />
								</div>
							{:else if kind === valueKinds.enum.series}
								<YearlyValuesEditor bind:value={values} />
								{#if !isValidValue}
									<p class="hint">
										<InfoCircleOutline />{$_(
											'create_objective_or_effect_dialog.planned_values_hint'
										)}
									</p>
								{/if}
							{:else}
								<BooleanValueToggle bind:checked={booleanValue} />
							{/if}
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</form>
</dialog>

<style>
	/* Sized like PickerDialog, whose catalog the first step resembles. */
	dialog {
		background-color: var(--color-gray-025);
		border: solid 1px var(--color-white);
		border-radius: 24px;
		box-shadow: var(--shadow-2xl);
		color: var(--color-gray-500);
		container-type: inline-size;
		height: calc(100vh - 1rem);
		/* clip instead of hidden: focusing the visually hidden radio button of a
		   card near the bottom edge must not scroll the dialog box itself */
		overflow: clip;
		padding: 0.75rem;
		width: calc(100vw - 1rem);
	}

	dialog::backdrop {
		backdrop-filter: blur(12px) brightness(0.75);
	}

	@media (min-width: 48rem) {
		dialog {
			height: calc(100vh - 3rem);
			padding: 1.5rem;
			width: calc(100vw - 10rem);
		}
	}

	form {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	header {
		align-items: center;
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	header > button:not(.button-primary) {
		color: var(--color-gray-900);
	}

	h2 {
		color: var(--color-gray-900);
		flex: 1 1 auto;
		font-size: 1.125rem;
		font-weight: 600;
		min-width: 0;
	}

	.step-2 {
		align-items: flex-start;
		display: flex;
		gap: 1rem;
		justify-content: center;
		min-height: 0;
	}

	/* The chosen indicator is shown on the left, next to the definition. */
	.step-2:has(.chosen-indicator) {
		justify-content: flex-start;
	}

	.chosen-indicator {
		flex: 0 0 19.25rem;
	}

	.definition {
		background: var(--color-white);
		border: 1px solid var(--color-gray-200);
		border-radius: 16px;
		box-shadow: var(--shadow-sm);
		display: flex;
		flex: 1 1 auto;
		flex-direction: column;
		max-height: 100%;
		max-width: 50rem;
		overflow-y: auto;
		padding: 1.5rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 1rem;
	}

	.property-label {
		color: var(--color-gray-500);
		font-size: 0.875rem;
		line-height: 1.5;
		padding: 0.375rem 0;
	}

	.effect-title {
		color: var(--color-gray-900);
		font-size: 1.25rem;
		font-weight: 600;
		line-height: 1.25;
		padding: 0.25rem;
	}

	input.effect-title {
		background-color: transparent;
		border: none;
		border-radius: 8px;
		width: 100%;
	}

	/* An empty title is highlighted as missing. */
	input.effect-title:placeholder-shown {
		background-color: var(--color-red-050);
		font-weight: 400;
		line-height: 1.5;
		padding: 0.5rem;
	}

	input.effect-title::placeholder {
		color: var(--color-red-700);
	}

	.description :global(.milkdown .editor) {
		color: var(--color-gray-700);
		font-size: 1.25rem;
		padding: 0.5rem 0;
	}

	.tendency > :global(.segmented-button) {
		width: fit-content;
	}

	.unit {
		align-items: center;
		display: grid;
		gap: 0.5rem;
		grid-template-columns: minmax(7.5rem, 13.125rem) 1fr;
	}

	.unit-value {
		border: solid 1px var(--color-gray-050);
		border-radius: 8px;
		color: var(--color-gray-700);
		font-size: 0.875rem;
		font-weight: 500;
		line-height: 1.5;
		min-height: 2.25rem;
		padding: 0.375rem 0.75rem;
	}

	.hint {
		align-items: center;
		background-color: var(--color-yellow-050);
		border-radius: 8px;
		color: var(--color-yellow-900);
		display: flex;
		font-size: 0.875rem;
		gap: 0.5rem;
		line-height: 1.25;
		margin-top: 0.25rem;
		padding: 0.75rem;
		width: fit-content;
	}

	.hint > :global(svg) {
		flex-shrink: 0;
		height: 1rem;
		width: 1rem;
	}

	.error {
		background-color: var(--color-red-050);
		border: solid 1px var(--color-red-200);
		border-radius: 8px;
		color: var(--color-red-900);
		margin: 0 1rem;
		padding: 0.5rem 0.75rem;
	}
</style>
