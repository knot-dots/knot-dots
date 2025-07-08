<script lang="ts">
	import { _ } from 'svelte-i18n';
	import fetchContainers from '$lib/client/fetchContainers';
	import SingleChoiceDropdown from '$lib/components/SingleChoiceDropdown.svelte';
	import { type Container, payloadTypes, predicates, type ProgramContainer } from '$lib/models';

	interface Props {
		container: Container;
	}

	let { container = $bindable() }: Props = $props();
	let organization = $derived(container.organization);
	let organizationalUnit = $derived(container.organizational_unit);
	let programCandidatesRequest = $derived.by(
		() =>
			fetchContainers({
				organization: [organization],
				...(organizationalUnit ? { organizationalUnit: [organizationalUnit] } : undefined),
				payloadType: [payloadTypes.enum.program]
			}) as Promise<ProgramContainer[]>
	);

	let isPartOfProgramObject = $derived(
		container.relation.find((r) => r.predicate === predicates.enum['is-part-of-program'])?.object
	);

	async function handleChange(event: Event) {
		const isPartOfProgramIndex = container.relation.findIndex(
			({ predicate, subject }) =>
				predicate === predicates.enum['is-part-of-program'] &&
				('guid' in container ? subject == container.guid : true)
		);

		const target = event.target as HTMLInputElement;
		const value = target.value;

		const isPartOfProgramOptions = await programCandidatesRequest;

		container.managed_by =
			isPartOfProgramOptions.find(({ guid }) => guid == value)?.managed_by ??
			container.organizational_unit ??
			container.organization;
		container.relation = [
			...container.relation.slice(0, isPartOfProgramIndex),
			...(value
				? [
						{
							subject: container.guid,
							object: value,
							position: 0,
							predicate: predicates.enum['is-part-of-program'],
							...('guid' in container ? { subject: container.guid } : undefined)
						}
					]
				: []),
			...container.relation.slice(isPartOfProgramIndex + 1)
		];

		target.closest('form')?.requestSubmit();
	}
</script>

{#await programCandidatesRequest}
	<SingleChoiceDropdown options={[]} value="" />
{:then programCandidates}
	<SingleChoiceDropdown
		options={[
			{ value: '', label: $_('empty') },
			...programCandidates.map(({ payload, revision }) => ({
				label: payload.title,
				value: String(revision)
			}))
		]}
		value={isPartOfProgramObject ? String(isPartOfProgramObject) : ''}
	/>
{/await}
