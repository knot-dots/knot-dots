<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import fetchContainers from '$lib/client/fetchContainers';
	import EditableSingleChoice from '$lib/components/EditableSingleChoice.svelte';
	import {
		type Container,
		type EmptyContainer,
		overlayKey,
		overlayURL,
		type PayloadType,
		payloadTypes,
		predicates
	} from '$lib/models';

	export let container: Container | EmptyContainer;
	export let editable = false;

	function createIsPartOfOptionsRequest(
		payloadType: PayloadType,
		organization: string,
		organizational_unit: string | null,
		measureGuid?: string,
		strategyGuid?: string
	): Promise<Container[]> {
		if (measureGuid) {
			return fetchContainers({
				isPartOfMeasure: [measureGuid],
				payloadType: [payloadTypes.enum.goal]
			}) as Promise<Container[]>;
		} else if (strategyGuid) {
			return fetchContainers({
				isPartOfStrategy: [strategyGuid],
				payloadType: [payloadTypes.enum.goal]
			}) as Promise<Container[]>;
		} else if (payloadType == payloadTypes.enum.task) {
			return fetchContainers({
				organization: [organization],
				organizationalUnit: organizational_unit ? [organizational_unit] : [],
				payloadType: [payloadTypes.enum.goal]
			}) as Promise<Container[]>;
		} else if (payloadType == payloadTypes.enum.organizational_unit) {
			return fetchContainers({
				organization: [organization],
				payloadType: [payloadTypes.enum.organizational_unit]
			}) as Promise<Container[]>;
		}

		return Promise.resolve([]);
	}

	$: organization = container.organization;

	$: organizationalUnit = container.organizational_unit;

	$: strategyGuid = container.relation.find(
		({ predicate }) => predicate === predicates.enum['is-part-of-strategy']
	)?.object;

	$: measureGuid = container.relation.find(
		({ object, predicate }) =>
			predicate === predicates.enum['is-part-of-measure'] &&
			(!('guid' in container) || object !== container.guid)
	)?.object;

	$: payloadType = container.payload.type;

	$: isPartOfOptionsRequest = createIsPartOfOptionsRequest(
		payloadType,
		organization,
		organizationalUnit,
		measureGuid,
		strategyGuid
	);

	$: isPartOfObject = (options: Array<{ value: string }>) =>
		container.relation.find(
			(r) =>
				r.predicate === predicates.enum['is-part-of'] &&
				options.some(({ value }) => value === r.object)
		)?.object ?? '';

	async function set(value: string) {
		const isPartOfIndex = container.relation.findIndex(
			({ predicate, subject }) =>
				predicate === predicates.enum['is-part-of'] &&
				('guid' in container ? subject == container.guid : true)
		);

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
	}
</script>

{#await isPartOfOptionsRequest}
	<EditableSingleChoice {editable} label={$_('superordinate_element')} options={[]} value="" />
{:then isPartOfOptions}
	{@const options = [
		{ label: $_('empty'), value: '' },
		...isPartOfOptions
			.filter(({ guid }) => !('guid' in container) || guid !== container.guid)
			.filter(({ relation }) =>
				strategyGuid
					? relation.some(({ predicate }) => predicate === predicates.enum['is-part-of-strategy'])
					: measureGuid
						? relation.some(({ predicate }) => predicate === predicates.enum['is-part-of-measure'])
						: true
			)
			.map(({ guid, payload }) => ({
				href: overlayURL($page.url, overlayKey.enum.view, guid),
				label: payload.title,
				value: guid
			}))
	]}
	<EditableSingleChoice
		{editable}
		label={$_('superordinate_element')}
		{options}
		bind:value={() => isPartOfObject(options), set}
	/>
{/await}
