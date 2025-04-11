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
			if (payloadType == payloadTypes.enum.milestone) {
				return fetchContainers({
					isPartOfMeasure: [measureGuid],
					payloadType: [payloadTypes.enum.measure_result]
				}) as Promise<Container[]>;
			} else if (payloadType == payloadTypes.enum.task) {
				return fetchContainers({
					isPartOfMeasure: [measureGuid],
					payloadType: [payloadTypes.enum.measure_result, payloadTypes.enum.milestone]
				}) as Promise<Container[]>;
			}
		} else if (strategyGuid) {
			if (payloadType == payloadTypes.enum.strategic_goal) {
				return fetchContainers({
					isPartOfStrategy: [strategyGuid],
					payloadType: [payloadTypes.enum.model, payloadTypes.enum.vision]
				}) as Promise<Container[]>;
			} else if (payloadType == payloadTypes.enum.operational_goal) {
				fetchContainers({
					isPartOfStrategy: [strategyGuid],
					payloadType: [payloadTypes.enum.model, payloadTypes.enum.vision]
				}) as Promise<Container[]>;
			} else if (
				payloadType == payloadTypes.enum.measure ||
				payloadType == payloadTypes.enum.simple_measure
			) {
				fetchContainers({
					isPartOfStrategy: [strategyGuid],
					payloadType: [payloadTypes.enum.model, payloadTypes.enum.vision]
				}) as Promise<Container[]>;
			}
		} else if (payloadType == payloadTypes.enum.task) {
			return fetchContainers({
				organization: [organization],
				organizationalUnit: organizational_unit ? [organizational_unit] : [],
				payloadType: [
					payloadTypes.enum.model,
					payloadTypes.enum.operational_goal,
					payloadTypes.enum.strategic_goal,
					payloadTypes.enum.vision
				]
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
		({ predicate }) => predicate === predicates.enum['is-part-of-measure']
	)?.object;

	$: payloadType = container.payload.type;

	$: isPartOfOptionsRequest = createIsPartOfOptionsRequest(
		payloadType,
		organization,
		organizationalUnit,
		measureGuid,
		strategyGuid
	);

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
	<EditableSingleChoice {editable} label={$_('superordinate_element')} options={[]} value="" />
{:then isPartOfOptions}
	<EditableSingleChoice
		{editable}
		handleChange={onChange}
		label={$_('superordinate_element')}
		options={[
			{ value: '', label: $_('empty') },
			...isPartOfOptions.map(({ guid, payload }) => ({
				href: overlayURL($page.url, overlayKey.enum.view, guid),
				label: payload.title,
				value: guid
			}))
		]}
		value={isPartOfObject ? isPartOfObject : ''}
	/>
{/await}
