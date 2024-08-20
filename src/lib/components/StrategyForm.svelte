<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Trash from '~icons/heroicons/trash';
	import { page } from '$app/stores';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import ListBox from '$lib/components/ListBox.svelte';
	import OrganizationSelector from '$lib/components/OrganizationSelector.svelte';
	import {
		audience,
		chapterTypeOptions,
		levels,
		strategyTypes,
		sustainableDevelopmentGoals,
		topics
	} from '$lib/models';
	import type { EmptyStrategyContainer, StrategyContainer } from '$lib/models';
	import { applicationState } from '$lib/stores';

	export let container: StrategyContainer | EmptyStrategyContainer;

	applicationState.update((state) => ({
		...state,
		containerForm: { tabs: [] }
	}));

	let levelParam = paramsFromURL($page.url).get('level') ?? levels.enum['level.local'];

	function removeImage() {
		delete container.payload.image;
		container.payload = container.payload;
	}

	function removePDF(index: number) {
		container.payload.pdf = [
			...container.payload.pdf.slice(0, index),
			...container.payload.pdf.slice(index + 1)
		];
	}
</script>

<label>
	{$_('level.label')}
	<select name="level" bind:value={container.payload.level} required>
		{#each levels.options as levelOption}
			<option value={levelOption} selected={levelOption === levelParam}>
				{$_(levelOption)}
			</option>
		{/each}
	</select>
</label>

<label>
	{$_('strategy_type.label')}
	<select name="strategy-type" bind:value={container.payload.strategyType} required>
		{#each strategyTypes.options as strategyTypeOption}
			<option value={strategyTypeOption}>
				{$_(strategyTypeOption)}
			</option>
		{/each}
	</select>
</label>

{#if 'image' in container.payload}
	<span class="preview">
		<img alt={$_('image')} src={container.payload.image} />
		<button
			class="quiet remove"
			title={$_('remove_image')}
			type="button"
			on:click|stopPropagation={removeImage}
		>
			<Trash />
		</button>
	</span>
{:else}
	<label>
		{$_('cover')}
		<input type="file" name="image" accept="image/png,image/jpeg" />
		<span class="help">{$_('upload.image.help')}</span>
	</label>
{/if}

{#if container.payload.pdf.length > 0}
	<ul>
		{#each container.payload.pdf as pdf, i}
			<li>
				<a href={pdf[0]}>{pdf[1]}</a>
				<button
					class="quiet remove"
					title={$_('remove_pdf')}
					type="button"
					on:click|stopPropagation={() => removePDF(i)}
				>
					<Trash />
				</button>
			</li>
		{/each}
	</ul>
{/if}

<label>
	{$_('pdf')}
	<input type="file" name="pdf" accept="application/pdf" multiple />
	<span class="help">{$_('upload.pdf.help')}</span>
</label>

<ListBox
	label={$_('chapter_type')}
	options={chapterTypeOptions}
	bind:value={container.payload.chapterType}
/>

<ListBox label={$_('topic.label')} options={topics.options} bind:value={container.payload.topic} />

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
