<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import { createFeatureDecisions } from '$lib/features';
	import saveContainer from '$lib/client/saveContainer';
	import ProgressSettingsDropdown from '$lib/components/ProgressSettingsDropdown.svelte';
	import SingleChoiceDropdown from '$lib/components/SingleChoiceDropdown.svelte';
	import StackedProgress from '$lib/components/StackedProgress.svelte';
	import {
		type AnyPayload,
		computeProgressSegments,
		type Container,
		type ContainerWithProgress,
		progressMeasurement,
		progressObjectType,
		type ProgressPayload
	} from '$lib/models';
	import { ability } from '$lib/stores';

	interface Props {
		container: Container<ProgressPayload>;
		editable?: boolean;
		heading: 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
		parentContainer: ContainerWithProgress;
		relatedContainers: Container<AnyPayload>[];
	}

	let {
		container = $bindable(),
		editable = false,
		heading,
		parentContainer = $bindable(),
		relatedContainers = $bindable()
	}: Props = $props();

	const id = crypto.randomUUID();

	let showComputedProgress = $derived(
		createFeatureDecisions(page.data.features).useComputedProgress() &&
			container.payload.measurement === progressMeasurement.enum.subordinateObjects
	);

	let objectTypeOptions = $derived(
		progressObjectType.options.map((o) => ({ label: $_(o), value: o }))
	);

	let segments = $derived(
		computeProgressSegments(
			parentContainer as Container<AnyPayload>,
			relatedContainers,
			container.payload.objectType
		)
	);

	async function handleChange() {
		const response = await saveContainer(parentContainer);
		if (response.ok) {
			const updatedContainer = await response.json();
			parentContainer.revision = updatedContainer.revision;
			await invalidate('containers');
		} else {
			const error = await response.json();
			alert(error.message);
		}
	}

	async function handleDelete() {
		parentContainer.payload.progress = undefined;

		const response = await saveContainer(parentContainer);
		if (response.ok) {
			const updatedContainer = await response.json();
			parentContainer.revision = updatedContainer.revision;
			await invalidate('containers');
		} else {
			const error = await response.json();
			alert(error.message);
		}
	}

	async function handleMeasurementChange() {
		if (
			container.payload.measurement === progressMeasurement.enum.subordinateObjects &&
			parentContainer.payload.progress !== undefined
		) {
			await handleDelete();
		}
	}
</script>

<header>
	<svelte:element this={heading} class="details-heading">{container.payload.title}</svelte:element>

	{#if editable}
		<ul class="inline-actions is-visible-on-hover">
			<li>
				<ProgressSettingsDropdown
					bind:container
					bind:parentContainer
					bind:relatedContainers
					ondelete={handleDelete}
					onmeasurementchange={handleMeasurementChange}
				/>
			</li>
		</ul>
	{/if}
</header>

{#if showComputedProgress}
	{#if editable && $ability.can('update', container)}
		<div class="object-type system-primary">
			<SingleChoiceDropdown
				options={objectTypeOptions}
				bind:value={
					() => container.payload.objectType,
					(value) => (container.payload.objectType = progressObjectType.parse(value))
				}
			/>
		</div>
	{/if}

	<div class="progress">
		<StackedProgress interactive {segments} />
	</div>
{:else}
	<div class="progress">
		{#if editable && $ability.can('update', parentContainer)}
			<label class="is-visually-hidden" for={id}>{$_('progress')}</label>
			<input
				bind:value={parentContainer.payload.progress}
				defaultValue="0"
				{id}
				list="steps"
				max="1"
				min="0"
				onchange={handleChange}
				oninput={(e) => e.stopPropagation()}
				step="0.1"
				type="range"
			/>
			<datalist id="steps">
				<option value="0"></option>
				<option value="0.1"></option>
				<option value="0.2"></option>
				<option value="0.3"></option>
				<option value="0.4"></option>
				<option value="0.5"></option>
				<option value="0.6"></option>
				<option value="0.7"></option>
				<option value="0.8"></option>
				<option value="0.9"></option>
				<option value="1"></option>
			</datalist>
		{:else}
			<progress
				style:--color={parentContainer.payload.progress && parentContainer.payload.progress > 0.7
					? 'var(--color-green-500)'
					: parentContainer.payload.progress && parentContainer.payload.progress > 0.3
						? 'var(--color-yellow-300)'
						: 'var(--color-red-600)'}
				value={parentContainer.payload.progress ?? 0}
			></progress>
		{/if}
	</div>
{/if}

<style>
	.progress {
		padding-bottom: 0.5rem;
	}

	.object-type {
		--dropdown-button-border-radius: calc(infinity * 1px);
		--dropdown-button-padding-x: 0.5rem;
		--dropdown-button-border-color: var(--color-border-accent-subtle);
		--dropdown-button-default-background: var(--color-background-accent-muted);
		--dropdown-button-hover-background: var(--color-background-accent-hover);
		--dropdown-button-default-color: var(--color-text-accent-default);
		--dropdown-button-chevron-default-color: var(--color-icon-accent-muted);

		display: flex;
		padding-bottom: 0.75rem;
	}

	input[type='range'] {
		margin: 0;
		padding: 0.125rem 0;
		width: 100%;
	}

	progress {
		width: 100%;
	}
</style>
