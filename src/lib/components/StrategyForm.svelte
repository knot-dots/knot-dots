<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ContainerForm from '$lib/components/ContainerForm.svelte';
	import ListBox from '$lib/components/ListBox.svelte';
	import { levels, strategyTypes, sustainableDevelopmentGoals, topics } from '$lib/models';
	import type { EmptyStrategyContainer, StrategyContainer } from '$lib/models';
	import { page } from '$app/stores';

	export let container: StrategyContainer | EmptyStrategyContainer;

	let levelParam = $page.url.searchParams.get('level') ?? levels.enum['level.local'];
</script>

<ContainerForm {container} on:submitSuccessful on:deleteSuccessful>
	<svelte:fragment slot="data">
		<label>
			<input type="file" name="upload" accept="image/png,image/jpeg" />
			{#if 'image' in container.payload}
				<img alt={$_('cover_image')} src={container.payload.image} />
			{/if}
		</label>
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
