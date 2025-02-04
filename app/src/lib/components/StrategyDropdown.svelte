<script lang="ts">
	import { _ } from 'svelte-i18n';
	import fetchContainers from '$lib/client/fetchContainers';
	import SingleChoiceDropdown from '$lib/components/SingleChoiceDropdown.svelte';
	import { type Container, payloadTypes, predicates, type StrategyContainer } from '$lib/models';

	interface Props {
		container: Container;
	}

	let { container = $bindable() }: Props = $props();
	let organization = $derived(container.organization);
	let organizationalUnit = $derived(container.organizational_unit);
	let strategyCandidatesRequest = $derived.by(
		() =>
			fetchContainers({
				organization: [organization],
				...(organizationalUnit ? { organizationalUnit: [organizationalUnit] } : undefined),
				payloadType: [payloadTypes.enum.strategy]
			}) as Promise<StrategyContainer[]>
	);

	let isPartOfStrategyObject = $derived(
		container.relation.find((r) => r.predicate === predicates.enum['is-part-of-strategy'])?.object
	);

	async function handleChange(event: Event) {
		const isPartOfStrategyIndex = container.relation.findIndex(
			({ predicate, subject }) =>
				predicate === predicates.enum['is-part-of-strategy'] &&
				('guid' in container ? subject == container.guid : true)
		);

		const target = event.target as HTMLInputElement;
		const value = target.value;

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
							subject: container.guid,
							object: value,
							position: 0,
							predicate: predicates.enum['is-part-of-strategy'],
							...('guid' in container ? { subject: container.guid } : undefined)
						}
					]
				: []),
			...container.relation.slice(isPartOfStrategyIndex + 1)
		];

		target.closest('form')?.requestSubmit();
	}
</script>

{#await strategyCandidatesRequest}
	<SingleChoiceDropdown handleChange={() => null} options={[]} value={undefined} />
{:then strategyCandidates}
	<SingleChoiceDropdown
		{handleChange}
		options={[
			{ value: undefined, label: $_('not_part_of_strategy') },
			...strategyCandidates.map(({ payload, revision }) => ({
				label: payload.title,
				value: String(revision)
			}))
		]}
		value={isPartOfStrategyObject ? String(isPartOfStrategyObject) : undefined}
	/>
{/await}
