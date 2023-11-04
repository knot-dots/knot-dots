<script lang="ts">
	import { Icon, Trash } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import ContainerForm from '$lib/components/ContainerForm.svelte';
	import ListBox from '$lib/components/ListBox.svelte';
	import { levels, strategyTypes, sustainableDevelopmentGoals, topics } from '$lib/models';
	import type { EmptyStrategyContainer, StrategyContainer } from '$lib/models';

	export let container: StrategyContainer | EmptyStrategyContainer;

	let levelParam = paramsFromURL($page.url).get('level') ?? levels.enum['level.local'];

	function removeImage() {
		delete container.payload.image;
		container.payload = container.payload;
	}

	function removePDF() {
		delete container.payload.pdf;
		container.payload = container.payload;
	}
</script>

<ContainerForm {container} on:submitSuccessful on:deleteSuccessful>
	<svelte:fragment slot="data">
		{#if 'image' in container.payload}
			<span class="preview">
				<img alt={$_('image')} src={container.payload.image} />
				<button
					class="quiet remove"
					title={$_('remove_image')}
					type="button"
					on:click|stopPropagation={removeImage}
				>
					<Icon src={Trash} size="20" />
				</button>
			</span>
		{:else}
			<label>
				{$_('cover')}
				<input type="file" name="image" accept="image/png,image/jpeg" />
				<span class="help">{$_('upload.image.help')}</span>
			</label>
		{/if}
		{#if 'pdf' in container.payload}
			<span>
				<a href={container.payload.pdf}>{$_('pdf')}</a>
				<button
					class="quiet remove"
					title={$_('remove_pdf')}
					type="button"
					on:click|stopPropagation={removePDF}
				>
					<Icon src={Trash} size="20" />
				</button>
			</span>
		{:else}
			<label>
				{$_('pdf')}
				<input type="file" name="pdf" accept="application/pdf" />
				<span class="help">{$_('upload.pdf.help')}</span>
			</label>
		{/if}
	</svelte:fragment>

	<svelte:fragment slot="meta">
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
	</svelte:fragment>
</ContainerForm>
