<script lang="ts">
	import { _ } from 'svelte-i18n';
	import {
		isOrganizationContainer,
		isOrganizationalUnitContainer,
		payloadTypes,
		predicates
	} from '$lib/models';
	import type { AnyContainer, Container, EmptyContainer } from '$lib/models';

	export let container: Container | EmptyContainer;
	export let isPartOfOptions: AnyContainer[];

	$: index = container.relation.findIndex(
		({ predicate, subject }) =>
			predicate === predicates.enum['is-part-of'] &&
			('revision' in container ? subject == container.revision : true)
	);

	function onChange(event: Event) {
		container.relation = [
			...container.relation.slice(0, index),
			{
				object: parseInt((event.target as HTMLInputElement).value),
				position: 0,
				predicate: predicates.enum['is-part-of'],
				...('revision' in container ? { subject: container.revision } : undefined)
			},
			...container.relation.slice(index + 1)
		];
	}
</script>

{#if isPartOfOptions.length > 0}
	<fieldset>
		<legend>
			{#if container.payload.type === payloadTypes.enum.model}
				{$_('superordinate_strategies')}
			{:else if container.payload.type === payloadTypes.enum.strategic_goal}
				{$_('superordinate_models')}
			{:else if container.payload.type === payloadTypes.enum.operational_goal}
				{$_('superordinate_strategic_goals')}
			{:else if container.payload.type === payloadTypes.enum.measure}
				{$_('superordinate_operational_goals')}
			{:else if container.payload.type === payloadTypes.enum.text}
				{$_('superordinate_chapters')}
			{:else if container.payload.type === payloadTypes.enum.organizational_unit}
				{$_('superordinate_organizational_unit')}
			{:else if container.payload.type === payloadTypes.enum['internal_objective.vision']}
				{$_('superordinate_internal_strategies')}
			{:else if container.payload.type === payloadTypes.enum['internal_objective.strategic_goal']}
				{$_('superordinate_visions')}
			{:else if container.payload.type === payloadTypes.enum['internal_objective.milestone']}
				{$_('superordinate_strategic_goals')}
			{:else if container.payload.type === payloadTypes.enum['internal_objective.task']}
				{$_('superordinate_milestones')}
			{/if}
		</legend>
		{#each isPartOfOptions as option}
			<label>
				<input
					type="radio"
					name="is-part-of"
					value={option.revision}
					checked={container.relation.findIndex(
						(r) => r.predicate === predicates.enum['is-part-of'] && r.object === option.revision
					) > -1}
					on:change={onChange}
				/>
				{#if 'name' in option.payload}
					{option.payload.name}
				{:else}
					{option.payload.title}
				{/if}
			</label>
		{/each}
	</fieldset>
{/if}
