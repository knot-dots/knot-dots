<script lang="ts">
	import type { Container, EmptyMilestoneContainer, MilestoneContainer } from '$lib/models';
	import { _ } from 'svelte-i18n';
	import InternalObjectiveForm from '$lib/components/InternalObjectiveForm.svelte';

	export let container: EmptyMilestoneContainer | MilestoneContainer;
	export let isPartOfOptions: Container[];
</script>

<InternalObjectiveForm {container} {isPartOfOptions} on:submitSuccessful on:deleteSuccessful>
	<svelte:fragment slot="extra-data">
		<label>
			{$_('progress')}
			<input
				type="range"
				max="1"
				min="0"
				list="steps"
				step="0.1"
				bind:value={container.payload.progress}
			/>
			<datalist id="steps">
				<option value="0"></option>
				<option value="0.1"></option>
				<option value="0.2"></option>
				<option value="0.3"></option>
				<option value="0.4"></option>
				<option value="0.5"></option>
				<option value="0.6"></option>
				<option value="0.7"></option>
				<option value="0.8"></option>
				<option value="0.9"></option>
				<option value="1"></option>
			</datalist>
		</label>
	</svelte:fragment>
	<slot slot="extra-buttons">
		<slot name="extra-buttons" />
	</slot>
</InternalObjectiveForm>

<style>
	input[type='range'] {
		width: 100%;
	}
</style>
