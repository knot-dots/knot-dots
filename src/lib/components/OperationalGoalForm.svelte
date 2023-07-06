<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ContainerForm from '$lib/components/ContainerForm.svelte';
	import IndicatorWizard from '$lib/components/IndicatorWizard.svelte';
	import RelationSelector from '$lib/components/RelationSelector.svelte';
	import { sustainableDevelopmentGoals } from '$lib/models';
	import type {
		Container,
		OperationalGoalContainer,
		EmptyOperationalGoalContainer
	} from '$lib/models.js';

	export let container: OperationalGoalContainer | EmptyOperationalGoalContainer;
	export let isPartOfOptions: Container[];

	let indicatorLocked = container.payload.indicator.length > 0;
</script>

<ContainerForm {container} on:submitSuccessful>
	<svelte:fragment slot="extra-data">
		<IndicatorWizard bind:indicator={container.payload.indicator} locked={indicatorLocked} />
	</svelte:fragment>

	<svelte:fragment slot="meta">
		<label>
			{$_('category')}
			<select name="category" bind:value={container.payload.category} required>
				<option label="" />
				{#each sustainableDevelopmentGoals.options as goal}
					<option value={goal}>
						{$_(goal)}
					</option>
				{/each}
			</select>
		</label>
		<RelationSelector
			{isPartOfOptions}
			payloadType={container.payload.type}
			selected={container.relation}
		/>
	</svelte:fragment>

	<slot slot="extra-buttons">
		<slot name="extra-buttons" />
	</slot>
</ContainerForm>
