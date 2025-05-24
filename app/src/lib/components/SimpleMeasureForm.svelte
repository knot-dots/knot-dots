<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Trash from '~icons/heroicons/trash';
	import AudienceSelector from '$lib/components/AudienceSelector.svelte';
	import CategorySelector from '$lib/components/CategorySelector.svelte';
	import Editor from '$lib/components/Editor.svelte';
	import MeasureTypeSelector from '$lib/components/MeasureTypeSelector.svelte';
	import OrganizationSelector from '$lib/components/OrganizationSelector.svelte';
	import PolicyFieldBNKSelector from '$lib/components/PolicyFieldBNKSelector.svelte';
	import StatusSelector from '$lib/components/StatusSelector.svelte';
	import StrategyRelationSelector from '$lib/components/StrategyRelationSelector.svelte';
	import TopicSelector from '$lib/components/TopicSelector.svelte';
	import type { EmptySimpleMeasureContainer, SimpleMeasureContainer } from '$lib/models';

	export let container: SimpleMeasureContainer | EmptySimpleMeasureContainer;

	function removeFile(index: number) {
		container.payload.file = [
			...container.payload.file.slice(0, index),
			...container.payload.file.slice(index + 1)
		];
	}
</script>

<fieldset class="form-tab" id="basic-data">
	<Editor label={$_('description')} bind:value={container.payload.description} />

	<label>
		{$_('progress')}
		<input
			type="range"
			max="1"
			min="0"
			list="steps"
			step="0.1"
			bind:value={container.payload.progress}
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
	</label>

	{#key 'guid' in container ? container.guid : ''}
		<Editor label={$_('annotation')} bind:value={container.payload.annotation} />
	{/key}

	{#if container.payload.file.length > 0}
		<ul>
			{#each container.payload.file as file, i}
				<li>
					<a href={file[0]}>{file[1]}</a>
					<button
						class="quiet remove"
						title={$_('remove_file')}
						type="button"
						on:click|stopPropagation={() => removeFile(i)}
					>
						<Trash />
					</button>
				</li>
			{/each}
		</ul>
	{/if}
	<label>
		{$_('files')}
		<input
			type="file"
			name="file"
			accept="application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
			multiple
		/>
		<span class="help">{$_('upload.file.help')}</span>
	</label>

	<fieldset class="duration">
		<legend>{$_('planned_duration')}</legend>
		<label>
			{$_('start_date')}
			<input type="date" name="startDate" bind:value={container.payload.startDate} />
		</label>
		<label>
			{$_('end_date')}
			<input type="date" name="endDate" bind:value={container.payload.endDate} />
		</label>
	</fieldset>
</fieldset>

<fieldset class="form-tab" id="metadata">
	<legend>{$_('form.metadata')}</legend>

	<StatusSelector bind:value={container.payload.status} />

	<MeasureTypeSelector bind:value={container.payload.measureType} />

	<StrategyRelationSelector {container} />

	<TopicSelector bind:value={container.payload.topic} />

	<PolicyFieldBNKSelector bind:value={container.payload.policyFieldBNK} />

	<CategorySelector bind:value={container.payload.category} />

	<AudienceSelector bind:value={container.payload.audience} />

	<OrganizationSelector bind:container />
</fieldset>

<style>
	.duration {
		display: flex;
		gap: 1rem;
	}
</style>
