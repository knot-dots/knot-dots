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
					object: o,
					position: 0,
					predicate: 'is-part-of'
				})
			);
	}

	$: index = container.relation.findIndex(
		({ predicate, subject }) =>
			predicate === predicates.enum['is-part-of'] &&
			('guid' in container ? subject == container.guid : true)
	);

	function onChange(event: Event) {
		const value = (event as CustomEvent).detail.selected?.value;

		container.relation = [
			...container.relation.slice(0, index),
			...(value
				? [
						{
							object: value,
							position: 0,
							predicate: predicates.enum['is-part-of'],
							...('guid' in container ? { subject: container.guid } : undefined)
						}
					]
				: []),
			...container.relation.slice(index + 1)
		];
	}
</script>

{#if isPartOfOptions.length > 0}
	<p>{$_('superordinate_organizational_unit')}</p>
	<ListBox
		label={$_('superordinate_organizational_unit')}
		options={[
			{
				value: undefined,
				label:
					$page.data.organizations.find(({ guid }) => guid === container.organization)?.payload
						.name ?? ''
			},
			...isPartOfOptions.map(({ payload, guid }) => ({
				value: guid,
				label: payload.name
			}))
		]}
		value={container.relation.find((r) => r.predicate === predicates.enum['is-part-of'])?.object}
		{onChange}
	/>
{/if}
