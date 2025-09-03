<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import fetchContainers from '$lib/client/fetchContainers';
	import EditableSingleChoice from '$lib/components/EditableSingleChoice.svelte';
	import {
		type Container,
		type EmptyContainer,
		findDescendants,
		overlayKey,
		overlayURL,
		type PayloadType,
		payloadTypes,
		predicates
	} from '$lib/models';

	interface Props {
		container: Container | EmptyContainer;
		editable?: boolean;
	}

	let { container = $bindable(), editable = false }: Props = $props();

	function createIsPartOfOptionsRequest(
		payloadType: PayloadType,
		organization: string,
		organizational_unit: string | null,
		measureGuid?: string,
		programGuid?: string
	): Promise<Container[]> {
		if (measureGuid) {
			return fetchContainers(
				{
					isPartOfMeasure: [measureGuid],
					payloadType: [payloadTypes.enum.goal]
				},
				'alpha'
			) as Promise<Container[]>;
		} else if (programGuid) {
			return fetchContainers(
				{
					isPartOfProgram: [programGuid],
					payloadType:
						payloadType == payloadTypes.enum.knowledge
							? [payloadTypes.enum.knowledge]
							: [payloadTypes.enum.goal]
				},
				'alpha'
			) as Promise<Container[]>;
		} else if (payloadType == payloadTypes.enum.task) {
			return fetchContainers(
				{
					organization: [organization],
					organizationalUnit: organizational_unit ? [organizational_unit] : [],
					payloadType: [payloadTypes.enum.goal]
				},
				'alpha'
			) as Promise<Container[]>;
		}

		return Promise.resolve([]);
	}

	let organization = $derived(container.organization);

	let organizationalUnit = $derived(container.organizational_unit);

	let programGuid = $derived(
		container.relation.find(({ predicate }) => predicate === predicates.enum['is-part-of-program'])
			?.object
	);

	let measureGuid = $derived(
		container.relation.find(
			({ object, predicate }) =>
				predicate === predicates.enum['is-part-of-measure'] &&
				(!('guid' in container) || object !== container.guid)
		)?.object
	);

	let payloadType = $derived(container.payload.type);

	let isPartOfOptionsRequest = $derived(
		createIsPartOfOptionsRequest(
			payloadType,
			organization,
			organizationalUnit,
			measureGuid,
			programGuid
		)
	);

	let isPartOfObject = $derived(
		(options: Array<{ value: string }>) =>
			container.relation.find(
				(r) =>
					r.predicate === predicates.enum['is-part-of'] &&
					options.some(({ value }) => value === r.object)
			)?.object ?? ''
	);

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
			.filter(
				({ guid }) =>
					!('guid' in container) ||
					!findDescendants(container, isPartOfOptions, [predicates.enum['is-part-of']])
						.map((c) => c.guid)
						.includes(guid)
			)
			.filter(({ relation }) =>
				programGuid
					? relation.some(({ predicate }) => predicate === predicates.enum['is-part-of-program'])
					: measureGuid
						? relation.some(({ predicate }) => predicate === predicates.enum['is-part-of-measure'])
						: true
			)
			.map(({ guid, payload }) => ({
				href: overlayURL(page.url, overlayKey.enum.view, guid),
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
