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
		payloadTypes,
		predicates,
		type StrategyContainer
	} from '$lib/models';

	export let container: Container | EmptyContainer;
	export let editable = false;

	$: organization = container.organization;

	$: organizationalUnit = container.organizational_unit;

	$: strategyCandidatesRequest = fetchContainers({
		organization: [organization],
		...(organizationalUnit ? { organizationalUnit: [organizationalUnit] } : undefined),
		payloadType: [payloadTypes.enum.strategy]
	}) as Promise<StrategyContainer[]>;

	$: isPartOfStrategyObject =
		container.relation.find((r) => r.predicate === predicates.enum['is-part-of-strategy'])
			?.object ?? '';

	async function set(value: string) {
		const isPartOfStrategyIndex = container.relation.findIndex(
			({ predicate, subject }) =>
				predicate === predicates.enum['is-part-of-strategy'] &&
				('guid' in container ? subject == container.guid : true)
		);

		const isPartOfStrategyOptions = await strategyCandidatesRequest;

		container.managed_by =
			isPartOfStrategyOptions.find(({ guid }) => guid == value)?.managed_by ??
			container.organizational_unit ??
			container.organization;
		container.relation = [
			...container.relation.slice(0, isPartOfStrategyIndex),
			...(value
				? [
						{
							object: value,
							position: 0,
							predicate: predicates.enum['is-part-of-strategy'],
							...('guid' in container ? { subject: container.guid } : undefined)
						}
					]
				: []),
			...container.relation.slice(isPartOfStrategyIndex + 1)
		];
	}
</script>

{#await strategyCandidatesRequest}
	<EditableSingleChoice {editable} label={$_('strategy')} options={[]} value="" />
{:then strategyCandidates}
	<EditableSingleChoice
		{editable}
		label={$_('strategy')}
		options={[
			{ label: $_('empty'), value: '' },
			...strategyCandidates.map(({ guid, payload }) => ({
				href: overlayURL($page.url, overlayKey.enum.view, guid),
				label: payload.title,
				value: guid
			}))
		]}
		bind:value={() => isPartOfStrategyObject, set}
	/>
{/await}
