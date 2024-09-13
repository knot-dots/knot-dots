<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import fetchIsPartOfOptions from '$lib/client/fetchIsPartOfOptions';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import ListBox from '$lib/components/ListBox.svelte';
	import {
		type EmptyOrganizationalUnitContainer,
		type OrganizationalUnitContainer,
		type PartialRelation,
		payloadTypes,
		predicates
	} from '$lib/models';

	export let container: OrganizationalUnitContainer | EmptyOrganizationalUnitContainer;

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

	$: organization = container.organization;

	$: isPartOfOptionsRequest = fetchIsPartOfOptions(
		organization,
		payloadTypes.enum.organizational_unit
	) as Promise<OrganizationalUnitContainer[]>;

	$: filterByLevel = ({ payload }: OrganizationalUnitContainer) =>
		container.payload.level === payload.level + 1;

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

{#await isPartOfOptionsRequest then isPartOfOptions}
	{#if isPartOfOptions.filter(filterByLevel).length > 0}
		<div>
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
					...isPartOfOptions.filter(filterByLevel).map(({ payload, revision }) => ({
						value: revision,
						label: payload.name
					}))
				]}
				value={container.relation.find((r) => r.predicate === predicates.enum['is-part-of'])
					?.object}
				on:change={onChange}
			/>
		</div>
	{/if}
{/await}
