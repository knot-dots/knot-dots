<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Trash from '~icons/heroicons/trash';
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

<ListBox
	label={$_('level.label')}
	options={levels.options.map((o) => ({ value: o, label: $_(o) }))}
	bind:value={container.payload.level}
/>

<ListBox
	label={$_('strategy_type.label')}
	options={strategyTypes.options.map((o) => ({ value: o, label: $_(o) }))}
	bind:value={container.payload.strategyType}
/>

{#if 'image' in container.payload}
	<div class="meta">
		<span class="meta-key">{$_('cover')}</span>
		<span class="meta-value preview">
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
	</div>
{:else}
	<label class="meta">
		<span class="meta-key"></span>
		<p class="meta-value">
			<input type="file" name="image" accept="image/png,image/jpeg" />
			<span class="help">{$_('upload.image.help')}</span>
		</p>
	</label>
{/if}

<label class="meta">
	<span class="meta-key">{$_('pdf')}</span>
	<div class="meta-value">
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
		<input type="file" name="pdf" accept="application/pdf" multiple />
		<span class="help">{$_('upload.pdf.help')}</span>
	</div>
</label>

<ListBox
	label={$_('chapter_type')}
	options={chapterTypeOptions.map((o) => ({ value: o, label: $_(o) }))}
	bind:value={container.payload.chapterType}
/>

<ListBox
	label={$_('topic.label')}
	options={topics.options.map((o) => ({ value: o, label: $_(o) }))}
	bind:value={container.payload.topic}
/>

<ListBox
	label={$_('category')}
	options={sustainableDevelopmentGoals.options.map((o) => ({ value: o, label: $_(o) }))}
	bind:value={container.payload.category}
/>

<ListBox
	label={$_('audience')}
	options={audience.options.map((o) => ({ value: o, label: $_(o) }))}
	bind:value={container.payload.audience}
/>

<OrganizationSelector bind:container />
