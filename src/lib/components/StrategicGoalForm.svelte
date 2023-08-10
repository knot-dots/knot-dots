<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ContainerForm from '$lib/components/ContainerForm.svelte';
	import Editor from '$lib/components/Editor.svelte';
	import ListBox from '$lib/components/ListBox.svelte';
	import RelationSelector from '$lib/components/RelationSelector.svelte';
	import { sustainableDevelopmentGoals, topics } from '$lib/models';
	import type { Container, EmptyStrategicGoalContainer, StrategicGoalContainer } from '$lib/models';

	export let container: StrategicGoalContainer | EmptyStrategicGoalContainer;
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
		<RelationSelector {container} {isPartOfOptions} />
	</svelte:fragment>

	<slot slot="extra-buttons">
		<slot name="extra-buttons" />
	</slot>
</ContainerForm>
