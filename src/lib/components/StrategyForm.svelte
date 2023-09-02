<script lang="ts">
	import { Icon, Trash } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import ContainerForm from '$lib/components/ContainerForm.svelte';
	import ListBox from '$lib/components/ListBox.svelte';
	import { levels, strategyTypes, sustainableDevelopmentGoals, topics } from '$lib/models';
	import type { EmptyStrategyContainer, StrategyContainer } from '$lib/models';

	export let container: StrategyContainer | EmptyStrategyContainer;

	let levelParam = $page.url.searchParams.get('level') ?? levels.enum['level.local'];

	function removeImage() {
		delete container.payload.image;
		container.payload = container.payload;
	}
</script>

<ContainerForm {container} on:submitSuccessful on:deleteSuccessful>
	<svelte:fragment slot="data">
		{#if 'image' in container.payload}
			<span class="preview">
				<img alt={$_('image')} class="logo" src={container.payload.image} />
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
				{$_('logo')}
				<input type="file" name="upload" accept="image/png,image/jpeg" />
				<span class="help">{$_('image_upload_help')}</span>
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

	<slot slot="extra-buttons">
		<slot name="extra-buttons" />
	</slot>
</ContainerForm>
