<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import { payloadTypes, predicates } from '$lib/models';
	import type { AnyContainer, Container, EmptyContainer, PartialRelation } from '$lib/models';

	export let container: Container | EmptyContainer;
	export let isPartOfOptions: AnyContainer[];

	if (container.relation.length == 0) {
		container.relation = paramsFromURL($page.url)
			.getAll('is-part-of')
			.map(
				(o): PartialRelation => ({
					object: Number(o),
					position: 0,
					predicate: 'is-part-of'
				})
			)
			.concat(
				paramsFromURL($page.url)
					.getAll('is-part-of-measure')
					.map(
						(o): PartialRelation => ({
							object: Number(o),
							position: 0,
							predicate: 'is-part-of-measure'
						})
					)
			);
	}

	$: index = container.relation.findIndex(
		({ predicate, subject }) =>
			predicate === predicates.enum['is-part-of'] &&
			('revision' in container ? subject == container.revision : true)
	);

	function onChange(event: Event) {
		container.relation = [
			...container.relation.slice(0, index),
			{
				object: parseInt((event.target as HTMLSelectElement).value),
				position: 0,
				predicate: predicates.enum['is-part-of'],
				...('revision' in container ? { subject: container.revision } : undefined)
			},
			...container.relation.slice(index + 1)
		];
	}
</script>

{#if isPartOfOptions.length > 0}
	<label>
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
		{:else if container.payload.type === payloadTypes.enum.vision}
			{$_('superordinate_internal_strategies')}
		{:else if container.payload.type === payloadTypes.enum.measure_result}
			{$_('superordinate_visions')}
		{:else if container.payload.type === payloadTypes.enum.milestone}
			{$_('superordinate_strategic_goals')}
		{:else if container.payload.type === payloadTypes.enum.task}
			{$_('superordinate_milestones')}
		{/if}
		<select name="isPartOf" on:change={onChange}>
			{#each isPartOfOptions as option}
				<option
					selected={container.relation.findIndex(
						(r) => r.predicate === predicates.enum['is-part-of'] && r.object === option.revision
					) > -1}
					on:change={onChange}
				>
					{#if 'name' in option.payload}
						{option.payload.name}
					{:else}
						{option.payload.title}
					{/if}
				</option>
			{/each}
		</select>
	</label>
{/if}
