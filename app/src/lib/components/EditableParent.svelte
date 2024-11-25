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
		measureRevision?: number,
		strategyRevision?: number
	): Promise<Container[]> {
		if (measureRevision) {
			if (payloadType == payloadTypes.enum.milestone) {
				return fetchContainers({
					isPartOfMeasure: [measureRevision],
					payloadType: [payloadTypes.enum.measure_result]
				}) as Promise<Container[]>;
			} else if (payloadType == payloadTypes.enum.task) {
				return fetchContainers({
					isPartOfMeasure: [measureRevision],
					payloadType: [payloadTypes.enum.measure_result, payloadTypes.enum.milestone]
				}) as Promise<Container[]>;
			}
		} else if (strategyRevision) {
			if (payloadType == payloadTypes.enum.strategic_goal) {
				return fetchContainers({
					isPartOfStrategy: [strategyRevision],
					payloadType: [payloadTypes.enum.model, payloadTypes.enum.vision]
				}) as Promise<Container[]>;
			} else if (payloadType == payloadTypes.enum.operational_goal) {
				fetchContainers({
					isPartOfStrategy: [strategyRevision],
					payloadType: [payloadTypes.enum.model, payloadTypes.enum.vision]
				}) as Promise<Container[]>;
			} else if (
				payloadType == payloadTypes.enum.measure ||
				payloadType == payloadTypes.enum.simple_measure
			) {
				fetchContainers({
					isPartOfStrategy: [strategyRevision],
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

	$: strategyRevision = container.relation.find(
		({ predicate }) => predicate === predicates.enum['is-part-of-strategy']
	)?.object;

	$: measureRevision = container.relation.find(
		({ predicate }) => predicate === predicates.enum['is-part-of-measure']
	)?.object;

	$: payloadType = container.payload.type;

	$: isPartOfOptionsRequest = createIsPartOfOptionsRequest(
		payloadType,
		organization,
		organizationalUnit,
		measureRevision,
		strategyRevision
	);

	$: isPartOfObject = container.relation.find(
		(r) => r.predicate === predicates.enum['is-part-of']
	)?.object;

	async function onChange(event: Event) {
		const isPartOfIndex = container.relation.findIndex(
			({ predicate, subject }) =>
				predicate === predicates.enum['is-part-of'] &&
				('revision' in container ? subject == container.revision : true)
		);

		const target = event.target as HTMLInputElement;
		const value = parseInt(target.value);

		container.relation = [
			...container.relation.slice(0, isPartOfIndex),
			...(value
				? [
						{
							object: value,
							position: 0,
							predicate: predicates.enum['is-part-of'],
							...('revision' in container ? { subject: container.revision } : undefined)
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
		label={$_('superordinate_element')}
		options={[]}
		value={undefined}
	/>
{:then isPartOfOptions}
	<EditableSingleChoice
		{editable}
		label={$_('superordinate_element')}
		options={[
			{ value: undefined, label: $_('not_part_of') },
			...isPartOfOptions.map(({ guid, payload, revision }) => ({
				href: overlayURL($page.url, overlayKey.enum.view, guid),
				label: payload.title,
				value: String(revision)
			}))
		]}
		value={isPartOfObject ? String(isPartOfObject) : undefined}
		on:change={onChange}
	/>
{/await}
