<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import tooltip from '$lib/attachments/tooltip';
	import { createFeatureDecisions } from '$lib/features';
	import saveContainer from '$lib/client/saveContainer';
	import ProgressSettingsDropdown from '$lib/components/ProgressSettingsDropdown.svelte';
	import SingleChoiceDropdown from '$lib/components/SingleChoiceDropdown.svelte';
	import {
		type AnyPayload,
		type Container,
		type ContainerWithProgress,
		findDescendants,
		isContainerWithStatus,
		overlayKey,
		overlayURL,
		payloadTypes,
		predicates,
		progressMeasurement,
		progressObjectType,
		type ProgressPayload,
		status
	} from '$lib/models';
	import { ability } from '$lib/stores';
	import { statusColors } from '$lib/theme/models';

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
		findDescendants(parentContainer as Container<AnyPayload>, relatedContainers, [
			predicates.enum['is-part-of']
		])
			.filter(({ payload }) =>
				container.payload.objectType === payloadTypes.enum.measure
					? payload.type === payloadTypes.enum.measure ||
						payload.type === payloadTypes.enum.simple_measure
					: payload.type === container.payload.objectType
			)
			.filter(isContainerWithStatus)
			.sort(
				(a, b) =>
					status.options.indexOf(a.payload.status) - status.options.indexOf(b.payload.status)
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
		<div class="object-type">
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
		<div class="stacked-progress">
			{#each segments as segment (segment.guid)}
				{@const label = `${'title' in segment.payload ? segment.payload.title : ''}: ${$_(segment.payload.status)}`}
				<!-- svelte-ignore a11y_consider_explicit_label (the tooltip attachment provides aria-labelledby) -->
				<a
					class="segment"
					href={overlayURL(page.url, overlayKey.enum.view, segment.guid)}
					style:background={`var(--color-${statusColors.get(segment.payload.status)}-300)`}
					{@attach tooltip(label)}
				></a>
			{/each}
		</div>
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
		--color-accent-on-default: var(--color-primary-700);
		--dropdown-button-border-radius: 9999px;
		--dropdown-button-chevron-default-color: var(--color-primary-700);
		--dropdown-button-chevron-expanded-color: var(--color-primary-700);
		--dropdown-button-default-background: var(--color-primary-100);
		--dropdown-button-default-color: var(--color-primary-700);
		--dropdown-button-expanded-background: var(--color-primary-100);
		--dropdown-button-hover-background: var(--color-primary-100);
		--dropdown-button-padding-x: 0.5rem;

		display: flex;
		padding-bottom: 0.75rem;
	}

	.stacked-progress {
		background: var(--color-gray-200);
		border-radius: 9999px;
		display: flex;
		gap: 2px;
		height: 0.5rem;
		overflow: hidden;
		width: 100%;
	}

	.segment {
		flex: 1 1 0;
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
