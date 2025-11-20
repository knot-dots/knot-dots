<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { invalidate } from '$app/navigation';
	import saveContainer from '$lib/client/saveContainer';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import {
		type AnyContainer,
		type ContainerWithProgress,
		type ProgressContainer
	} from '$lib/models';
	import { ability } from '$lib/stores';

	interface Props {
		container: ProgressContainer;
		editable?: boolean;
		parentContainer: ContainerWithProgress;
		relatedContainers: AnyContainer[];
	}

	let {
		container = $bindable(),
		editable = false,
		parentContainer = $bindable(),
		relatedContainers = $bindable()
	}: Props = $props();

	const id = crypto.randomUUID();

	async function handleChange(event: Event) {
		event.stopPropagation();

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
</script>

<header>
	<h2 class="details-heading">{container.payload.title}</h2>

	{#if editable}
		<ul class="inline-actions is-visible-on-hover">
			<li>
				<ContainerSettingsDropdown bind:container bind:parentContainer bind:relatedContainers />
			</li>
		</ul>
	{/if}
</header>

<div class="progress">
	{#if editable && $ability.can('update', parentContainer)}
		<label class="is-visually-hidden" for={id}>{$_('progress')}</label>
		<input
			bind:value={parentContainer.payload.progress}
			{id}
			list="steps"
			max="1"
			min="0"
			onchange={handleChange}
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

<style>
	div {
		padding-bottom: 0.5rem;
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
