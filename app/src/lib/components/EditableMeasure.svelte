<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import fetchContainers from '$lib/client/fetchContainers';
	import EditableSingleChoice from '$lib/components/EditableSingleChoice.svelte';
	import {
		type Container,
		type ContainerWithEffect,
		type EmptyContainer,
		overlayKey,
		overlayURL,
		payloadTypes,
		predicates
	} from '$lib/models';

	export let container: Container | EmptyContainer;
	export let editable = false;

	$: organization = container.organization;

	$: organizationalUnit = container.organizational_unit;

	$: measureCandidatesRequest = fetchContainers({
		organization: [organization],
		...(organizationalUnit ? { organizationalUnit: [organizationalUnit] } : undefined),
		payloadType: [payloadTypes.enum.measure]
	}) as Promise<ContainerWithEffect[]>;

	$: isPartOfMeasureObject = container.relation.find(
		(r) => r.predicate === predicates.enum['is-part-of-measure']
	)?.object;

	async function onChange(event: Event) {
		const isPartOfMeasureIndex = container.relation.findIndex(
			({ predicate, subject }) =>
				predicate === predicates.enum['is-part-of-measure'] &&
				('guid' in container ? subject == container.guid : true)
		);

		const target = event.target as HTMLInputElement;
		const value = target.value;

		const isPartOfMeasureOptions = await measureCandidatesRequest;

		container.managed_by =
			isPartOfMeasureOptions.find(({ guid }) => guid == value)?.managed_by ??
			container.organizational_unit ??
			container.organization;
		container.relation = [
			...container.relation.slice(0, isPartOfMeasureIndex),
			...(value
				? [
						{
							object: value,
							position: 0,
							predicate: predicates.enum['is-part-of-measure'],
							...('guid' in container ? { subject: container.guid } : undefined)
						}
					]
				: []),
			...container.relation.slice(isPartOfMeasureIndex + 1)
		];

		target.closest('form')?.requestSubmit();
	}
</script>

{#await measureCandidatesRequest}
	<EditableSingleChoice {editable} label={$_('measure')} options={[]} value={undefined} />
{:then measureCandidates}
	<EditableSingleChoice
		{editable}
		handleChange={onChange}
		label={$_('measure')}
		options={[
			{ value: undefined, label: $_('not_part_of_measure') },
			...measureCandidates.map(({ guid, payload }) => ({
				href: overlayURL($page.url, overlayKey.enum.view, guid),
				label: payload.title,
				value: guid
			}))
		]}
		value={isPartOfMeasureObject ? String(isPartOfMeasureObject) : undefined}
	/>
{/await}
