<script lang="ts">
  import { _ } from 'svelte-i18n';
	import InternalObjectiveForm from "./InternalObjectiveForm.svelte";
	import {
	taskStatus,
		type Container,
    type EmptyTaskContainer,
    type TaskContainer,
	} from '$lib/models';
	export let container: TaskContainer | EmptyTaskContainer;
	export let isPartOfOptions: Container[];
</script>
<InternalObjectiveForm {container} {isPartOfOptions}>
  <svelte:fragment slot="extra-data">
    <label>
			<select name="status" bind:value={container.payload.taskStatus} required>
				{#each taskStatus.options as statusOption}
				<option value={statusOption}>
					{$_(statusOption)}
				</option>
				{/each}
			</select>
		</label>
  </svelte:fragment>
  <slot slot="extra-buttons">
		<slot name="extra-buttons" />
	</slot>
</InternalObjectiveForm>
