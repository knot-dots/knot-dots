<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
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

	interface Props {
		container: Container | EmptyContainer;
		editable?: boolean;
	}

	let { container = $bindable(), editable = false }: Props = $props();

	let organization = $derived(container.organization);

	let organizationalUnit = $derived(container.organizational_unit);

	let measureCandidatesRequest = $derived(
		fetchContainers(
			{
				organization: [organization],
				...(organizationalUnit ? { organizationalUnit: [organizationalUnit] } : undefined),
				payloadType: [payloadTypes.enum.measure]
			},
			'alpha'
		) as Promise<ContainerWithEffect[]>
	);

	let isPartOfMeasureObject = $derived(
		container.relation.find((r) => r.predicate === predicates.enum['is-part-of-measure'])?.object ??
			''
	);

	async function set(value: string) {
		const isPartOfMeasureIndex = container.relation.findIndex(
			({ predicate, subject }) =>
				predicate === predicates.enum['is-part-of-measure'] &&
				('guid' in container ? subject == container.guid : true)
		);

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
	}
</script>

{#await measureCandidatesRequest}
	<EditableSingleChoice {editable} label={$_('measure')} options={[]} value="" />
{:then measureCandidates}
	<EditableSingleChoice
		{editable}
		label={$_('measure')}
		options={[
			{ label: $_('empty'), value: '' },
			...measureCandidates.map(({ guid, payload }) => ({
				href: overlayURL(page.url, overlayKey.enum.view, guid),
				label: payload.title,
				value: guid
			}))
		]}
		bind:value={() => isPartOfMeasureObject, set}
	/>
{/await}
