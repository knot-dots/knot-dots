<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ContainerForm from '$lib/components/ContainerForm.svelte';
	import Editor from '$lib/components/Editor.svelte';
	import RelationSelector from '$lib/components/RelationSelector.svelte';
	import { sustainableDevelopmentGoals, topics } from '$lib/models';
	import type { Container, EmptyModelContainer, ModelContainer } from '$lib/models';

	export let container: ModelContainer | EmptyModelContainer;
	export let isPartOfOptions: Container[];
</script>

<ContainerForm {container} on:submitSuccessful on:deleteSuccessful>
	<svelte:fragment slot="data">
		<label>
			{$_('summary')}
			<textarea name="summary" maxlength="200" bind:value={container.payload.summary} required />
		</label>
		<Editor label={$_('description')} bind:value={container.payload.description} />
	</svelte:fragment>

	<svelte:fragment slot="meta">
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
		<RelationSelector {container} {isPartOfOptions} />
	</svelte:fragment>

	<slot slot="extra-buttons">
		<slot name="extra-buttons" />
	</slot>
</ContainerForm>
