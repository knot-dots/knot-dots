<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ContainerForm from '$lib/components/ContainerForm.svelte';
	import type {
		Container,
		EmptyInternalObjectiveContainer,
		InternalObjectiveContainer,
	} from '$lib/models';
	import Editor from '$lib/components/Editor.svelte';
	import RelationSelector from './RelationSelector.svelte';

	export let container: InternalObjectiveContainer | EmptyInternalObjectiveContainer;
	export let isPartOfOptions: Container[];
</script>

<ContainerForm {container} on:submitSuccessful on:deleteSuccessful>
	<svelte:fragment slot="data">
		<label>
			{$_('summary')}
			<textarea name="summary" maxlength="200" bind:value={container.payload.summary} required />
		</label>
		<Editor label={$_('description')} bind:value={container.payload.description} />
		<slot name="extra-data" />
	</svelte:fragment>

	<svelte:fragment slot="meta">
		<RelationSelector {container} {isPartOfOptions} />
	</svelte:fragment>

	<slot slot="extra-buttons">
		<slot name="extra-buttons" />
	</slot>
</ContainerForm>
