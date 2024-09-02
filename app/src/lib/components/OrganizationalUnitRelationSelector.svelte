<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import ListBox from '$lib/components/ListBox.svelte';
	import { predicates } from '$lib/models';
	import type {
		Container,
		EmptyContainer,
		OrganizationalUnitContainer,
		PartialRelation
	} from '$lib/models';

	export let container: Container | EmptyContainer;
	export let isPartOfOptions: OrganizationalUnitContainer[];

	if (container.relation.length == 0) {
		container.relation = paramsFromURL($page.url)
			.getAll('is-part-of')
			.map(
				(o): PartialRelation => ({
					object: Number(o),
					position: 0,
					predicate: 'is-part-of'
				})
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
		label={$_('superordinate_organizational_unit')}
		options={isPartOfOptions.map(({ payload, revision }) => ({
			value: revision,
			label: payload.name
		}))}
		value={container.relation.find((r) => r.predicate === predicates.enum['is-part-of'])?.object}
		on:change={onChange}
	/>
{/if}
