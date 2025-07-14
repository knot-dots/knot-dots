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
		type ProgramContainer
	} from '$lib/models';

	export let container: Container | EmptyContainer;
	export let editable = false;

	$: organization = container.organization;

	$: organizationalUnit = container.organizational_unit;

	$: programCandidatesRequest = fetchContainers(
		{
			organization: [organization],
			...(organizationalUnit ? { organizationalUnit: [organizationalUnit] } : undefined),
			payloadType: [payloadTypes.enum.program]
		},
		'alpha'
	) as Promise<ProgramContainer[]>;

	$: isPartOfProgramObject =
		container.relation.find((r) => r.predicate === predicates.enum['is-part-of-program'])?.object ??
		'';

	async function set(value: string) {
		const isPartOfProgramIndex = container.relation.findIndex(
			({ predicate, subject }) =>
				predicate === predicates.enum['is-part-of-program'] &&
				('guid' in container ? subject == container.guid : true)
		);

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
							object: value,
							position: 0,
							predicate: predicates.enum['is-part-of-program'],
							...('guid' in container ? { subject: container.guid } : undefined)
						}
					]
				: []),
			...container.relation.slice(isPartOfProgramIndex + 1)
		];
	}
</script>

{#await programCandidatesRequest}
	<EditableSingleChoice {editable} label={$_('program')} options={[]} value="" />
{:then programCandidates}
	<EditableSingleChoice
		{editable}
		label={$_('program')}
		options={[
			{ label: $_('empty'), value: '' },
			...programCandidates.map(({ guid, payload }) => ({
				href: overlayURL($page.url, overlayKey.enum.view, guid),
				label: payload.title,
				value: guid
			}))
		]}
		bind:value={() => isPartOfProgramObject, set}
	/>
{/await}
