<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import InternalObjectiveForm from '$lib/components/InternalObjectiveForm.svelte';
	import { taskStatus } from '$lib/models';
	import type { AnyContainer, EmptyTaskContainer, TaskContainer } from '$lib/models';

	export let container: TaskContainer | EmptyTaskContainer;
	export let isPartOfOptions: AnyContainer[];

	let statusParam = $page.url.searchParams.get('task-status');
</script>

<InternalObjectiveForm {container} {isPartOfOptions} on:submitSuccessful on:deleteSuccessful>
	<svelte:fragment slot="extra-data">
		<label>
			<select name="status" bind:value={container.payload.taskStatus} required>
				{#each taskStatus.options as statusOption}
					<option value={statusOption} selected={statusOption === statusParam}>
						{$_(statusOption)}
					</option>
				{/each}
			</select>
		</label>
	</svelte:fragment>

	<svelte:fragment slot="extra-meta">
		<label>
			{$_('fulfillment_date')}
			<input type="date" bind:value={container.payload.fulfillmentDate} />
		</label>
	</svelte:fragment>

	<slot slot="extra-buttons">
		<slot name="extra-buttons" />
	</slot>
</InternalObjectiveForm>
