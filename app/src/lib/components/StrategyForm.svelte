<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Trash from '~icons/heroicons/trash';
	import AudienceSelector from '$lib/components/AudienceSelector.svelte';
	import CategorySelector from '$lib/components/CategorySelector.svelte';
	import ChapterTypeSelector from '$lib/components/ChapterTypeSelector.svelte';
	import LevelSelector from '$lib/components/LevelSelector.svelte';
	import OrganizationSelector from '$lib/components/OrganizationSelector.svelte';
	import PolicyFieldBNKSelector from '$lib/components/PolicyFieldBNKSelector.svelte';
	import StrategyTypeSelector from '$lib/components/StrategyTypeSelector.svelte';
	import TopicSelector from '$lib/components/TopicSelector.svelte';
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

<LevelSelector bind:value={container.payload.level} />

<StrategyTypeSelector bind:value={container.payload.strategyType} />

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
	<div class="meta">
		<label class="meta-key" for="image">{$_('cover')}</label>
		<p class="meta-value">
			<input type="file" id="image" name="image" accept="image/png,image/jpeg" />
			<span class="help">{$_('upload.image.help')}</span>
		</p>
	</div>
{/if}

<div class="meta">
	<label class="meta-key" for="pdf">{$_('pdf')}</label>
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
		<input type="file" id="pdf" name="pdf" accept="application/pdf" multiple />
		<span class="help">{$_('upload.pdf.help')}</span>
	</div>
</div>

<ChapterTypeSelector bind:value={container.payload.chapterType} />

<TopicSelector bind:value={container.payload.topic} />

<PolicyFieldBNKSelector bind:value={container.payload.policyFieldBNK} />

<CategorySelector bind:value={container.payload.category} />

<AudienceSelector bind:value={container.payload.audience} />

<OrganizationSelector bind:container />
