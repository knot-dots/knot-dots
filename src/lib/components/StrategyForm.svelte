<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ContainerForm from '$lib/components/ContainerForm.svelte';
	import { levels, strategyTypes, sustainableDevelopmentGoals, topics } from '$lib/models';
	import type { EmptyStrategyContainer, StrategyContainer } from '$lib/models';
	import { page } from '$app/stores';

	export let container: StrategyContainer | EmptyStrategyContainer;

	let levelParam = $page.url.searchParams.get('level');
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
		<label>
			{$_('topic.label')}
			<select name="topic" bind:value={container.payload.topic} multiple>
				{#each topics.options as topicOption}
					<option value={topicOption}>
						{$_(topicOption)}
					</option>
				{/each}
			</select>
		</label>
		<label>
			{$_('category')}
			<select name="category" bind:value={container.payload.category} multiple>
				{#each sustainableDevelopmentGoals.options as goal}
					<option value={goal}>
						{$_(goal)}
					</option>
				{/each}
			</select>
		</label>
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
