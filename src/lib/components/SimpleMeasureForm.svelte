<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Trash from '~icons/heroicons/trash';
	import { page } from '$app/stores';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import Editor from '$lib/components/Editor.svelte';
	import ListBox from '$lib/components/ListBox.svelte';
	import OrganizationSelector from '$lib/components/OrganizationSelector.svelte';
	import StrategyRelationSelector from '$lib/components/StrategyRelationSelector.svelte';
	import { audience, measureTypes, status, sustainableDevelopmentGoals, topics } from '$lib/models';
	import type { EmptySimpleMeasureContainer, SimpleMeasureContainer } from '$lib/models';
	import { applicationState } from '$lib/stores';

	export let container: SimpleMeasureContainer | EmptySimpleMeasureContainer;

	applicationState.update((state) => ({
		...state,
		containerForm: {
			activeTab: 'guid' in container ? 'basic-data' : 'metadata',
			tabs: ['metadata', 'basic-data', 'resources']
		}
	}));

	let statusParam = paramsFromURL($page.url).get('status') ?? status.enum['status.idea'];

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

	<label class="meta">
		<span class="meta-key">{$_('status.label')}</span>
		<select class="meta-value" name="status" bind:value={container.payload.status} required>
			{#each status.options as statusOption}
				<option value={statusOption} selected={statusOption === statusParam}>
					{$_(statusOption)}
				</option>
			{/each}
		</select>
	</label>

	<ListBox
		label={$_('measure_type')}
		options={measureTypes.options}
		bind:value={container.payload.measureType}
	/>

	<StrategyRelationSelector {container} />

	<ListBox
		label={$_('topic.label')}
		options={topics.options}
		bind:value={container.payload.topic}
	/>

	<ListBox
		label={$_('category')}
		options={sustainableDevelopmentGoals.options}
		bind:value={container.payload.category}
	/>

	<ListBox
		label={$_('audience')}
		options={audience.options}
		bind:value={container.payload.audience}
	/>

	<OrganizationSelector bind:container />
</fieldset>

<style>
	.duration {
		display: flex;
		gap: 1rem;
	}
</style>
