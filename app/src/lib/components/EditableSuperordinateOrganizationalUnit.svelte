<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import fetchContainers from '$lib/client/fetchContainers';
	import EditableSingleChoice from '$lib/components/EditableSingleChoice.svelte';
	import {
		type EmptyOrganizationalUnitContainer,
		type OrganizationalUnitContainer,
		overlayKey,
		overlayURL,
		payloadTypes,
		predicates
	} from '$lib/models';

	export let container: OrganizationalUnitContainer | EmptyOrganizationalUnitContainer;
	export let editable = false;

	$: organization = container.organization;

	$: organizationalUnit = container.organizational_unit;

	$: isPartOfOptionsRequest = fetchContainers({
		organization: [organization],
		payloadType: [payloadTypes.enum.organizational_unit]
	}) as Promise<OrganizationalUnitContainer[]>;

	$: isPartOfObject = container.relation.find(
		(r) => r.predicate === predicates.enum['is-part-of']
	)?.object;

	async function onChange(event: Event) {
		const isPartOfIndex = container.relation.findIndex(
			({ predicate, subject }) =>
				predicate === predicates.enum['is-part-of'] &&
				('guid' in container ? subject == container.guid : true)
		);

		const target = event.target as HTMLInputElement;
		const value = target.value;

		container.relation = [
			...container.relation.slice(0, isPartOfIndex),
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
			...container.relation.slice(isPartOfIndex + 1)
		];

		target.closest('form')?.requestSubmit();
	}
</script>

{#await isPartOfOptionsRequest}
	<EditableSingleChoice
		{editable}
		label={$_('superordinate_organizational_unit')}
		options={[]}
		value={undefined}
	/>
{:then isPartOfOptions}
	<EditableSingleChoice
		{editable}
		handleChange={onChange}
		label={$_('superordinate_organizational_unit')}
		options={[
			{ value: undefined, label: $_('not_part_of') },
			...isPartOfOptions
				.filter(({ payload }) => container.payload.level === payload.level + 1)
				.map(({ guid, payload }) => ({
					href: overlayURL($page.url, overlayKey.enum.view, guid),
					label: payload.name,
					value: guid
				}))
		]}
		value={isPartOfObject}
	/>
{/await}
