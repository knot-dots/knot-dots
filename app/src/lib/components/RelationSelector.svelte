<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import ListBox from '$lib/components/ListBox.svelte';
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

	$: label = (function (payloadType) {
		switch (payloadType) {
			case payloadTypes.enum.model:
				return $_('superordinate_strategies');
			case payloadTypes.enum.strategic_goal:
				return $_('superordinate_models');
			case payloadTypes.enum.operational_goal:
				return $_('superordinate_strategic_goals');
			case payloadTypes.enum.measure:
				return $_('superordinate_operational_goals');
			case payloadTypes.enum.text:
				return $_('superordinate_chapters');
			case payloadTypes.enum.organizational_unit:
				return $_('superordinate_organizational_unit');
			case payloadTypes.enum.vision:
				return $_('superordinate_internal_strategies');
			case payloadTypes.enum.measure_result:
				return $_('superordinate_visions');
			case payloadTypes.enum.milestone:
				return $_('superordinate_strategic_goals');
			case payloadTypes.enum.task:
				return $_('superordinate_milestones');
			default:
				return '';
		}
	})(container.payload.type);

	function onChange(event: Event) {
		container.relation = [
			...container.relation.slice(0, index),
			{
				object: parseInt((event as CustomEvent).detail.selected.value),
				position: 0,
				predicate: predicates.enum['is-part-of'],
				...('revision' in container ? { subject: container.revision } : undefined)
			},
			...container.relation.slice(index + 1)
		];
	}
</script>

{#if isPartOfOptions.length > 0}
	<ListBox
		{label}
		options={isPartOfOptions.map(({ payload, revision }) => ({
			value: revision,
			label: 'name' in payload ? payload.name : payload.title
		}))}
		value={container.relation.find((r) => r.predicate === predicates.enum['is-part-of'])?.object}
		on:change={onChange}
	/>
{/if}
