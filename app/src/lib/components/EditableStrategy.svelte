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

	$: isPartOfStrategyObject = container.relation.find(
		(r) => r.predicate === predicates.enum['is-part-of-strategy']
	)?.object;

	async function onChange(event: Event) {
		const isPartOfStrategyIndex = container.relation.findIndex(
			({ predicate, subject }) =>
				predicate === predicates.enum['is-part-of-strategy'] &&
				('revision' in container ? subject == container.revision : true)
		);

		const value = parseInt((event.target as HTMLInputElement).value);

		const isPartOfStrategyOptions = await strategyCandidatesRequest;

		container.managed_by =
			isPartOfStrategyOptions.find(({ revision }) => revision == value)?.managed_by ??
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
							...('revision' in container ? { subject: container.revision } : undefined)
						}
					]
				: []),
			...container.relation.slice(isPartOfStrategyIndex + 1)
		];
	}
</script>

{#await strategyCandidatesRequest}
	<EditableSingleChoice {editable} label={$_('strategy')} options={[]} value={undefined} />
{:then strategyCandidates}
	<EditableSingleChoice
		{editable}
		label={$_('strategy')}
		options={[
			{ value: undefined, label: $_('not_part_of_strategy') },
			...strategyCandidates.map(({ guid, payload, revision }) => ({
				href: overlayURL($page.url, overlayKey.enum.view, guid),
				label: payload.title,
				value: String(revision)
			}))
		]}
		value={isPartOfStrategyObject ? String(isPartOfStrategyObject) : undefined}
		on:change={onChange}
	/>
{/await}
