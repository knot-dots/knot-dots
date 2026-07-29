<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import fetchContainers from '$lib/client/fetchContainers';
	import EditableSingleChoice from '$lib/components/EditableSingleChoice.svelte';
	import MultipleChoiceCombobox from '$lib/components/MultipleChoiceCombobox.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import {
		type AnyInitialPayload,
		type Container,
		type NewContainer,
		overlayKey,
		overlayURL,
		payloadTypes,
		predicates,
		type ProgramPayload
	} from '$lib/models';

	interface Props {
		container: Container | NewContainer<AnyInitialPayload>;
		editable?: boolean;
	}

	let { container = $bindable(), editable = false }: Props = $props();

	let organization = $derived(container.organization);

	// All programs of the organization are selectable; the dropdown groups them
	// by organizational unit instead of filtering on the container's unit.
	let programCandidatesRequest = $derived(
		fetchContainers(
			{
				organization: [organization],
				payloadType: [payloadTypes.enum.program]
			},
			'alpha'
		) as Promise<Container<ProgramPayload>[]>
	);

	function groupName(candidate: Container<ProgramPayload>) {
		return (
			page.data.organizationalUnits.find(({ guid }) => guid === candidate.organizational_unit)
				?.payload.name ?? page.data.currentOrganization.payload.name
		);
	}

	let isPartOfProgramObjects = $derived(
		container.relation
			.filter(
				({ predicate, subject }) =>
					predicate === predicates.enum['is-part-of-program'] &&
					('guid' in container ? subject == container.guid : true)
			)
			.map(({ object }) => object)
			.filter((object): object is string => object != undefined)
	);

	async function set(values: string[]) {
		const isPartOfProgramOptions = await programCandidatesRequest;

		container.managed_by = isPartOfProgramOptions.find(({ guid }) => guid == values[0])
			?.managed_by ?? [container.organizational_unit ?? container.organization];
		container.relation = [
			// Keep the still-selected program relations with their positions, drop the
			// deselected ones, leave every other relation untouched.
			...container.relation.filter(
				({ object, predicate, subject }) =>
					predicate !== predicates.enum['is-part-of-program'] ||
					('guid' in container && subject != container.guid) ||
					(object != undefined && values.includes(object))
			),
			...values
				.filter((value) => !isPartOfProgramObjects.includes(value))
				.map((value) => ({
					object: value,
					position: 0,
					predicate: predicates.enum['is-part-of-program'],
					...('guid' in container ? { subject: container.guid } : undefined)
				}))
		];
	}

	// The single-select fallback funnels through the same write path: selecting
	// one program is the special case of selecting a list of one.
	async function setSingle(value: string) {
		await set(value ? [value] : []);
	}

	const id = crypto.randomUUID();
</script>

{#if createFeatureDecisions(page.data.features).useMultipleProgramAssignment()}
	<div class="label" {id}>{$_('program')}</div>
	{#await programCandidatesRequest}
		<MultipleChoiceCombobox {editable} labelledBy={id} options={[]} value={[]} />
	{:then programCandidates}
		<MultipleChoiceCombobox
			{editable}
			labelledBy={id}
			options={programCandidates.map((candidate) => ({
				group: groupName(candidate),
				href: overlayURL(page.url, overlayKey.enum.view, candidate.guid),
				label: candidate.payload.title,
				value: candidate.guid
			}))}
			bind:value={() => isPartOfProgramObjects, set}
		/>
	{/await}
{:else}
	{#await programCandidatesRequest}
		<EditableSingleChoice {editable} label={$_('program')} options={[]} value="" />
	{:then programCandidates}
		<EditableSingleChoice
			{editable}
			label={$_('program')}
			options={[
				{ label: $_('empty'), value: '' },
				...programCandidates.map(({ guid, payload }) => ({
					href: overlayURL(page.url, overlayKey.enum.view, guid),
					label: payload.title,
					value: guid
				}))
			]}
			bind:value={() => isPartOfProgramObjects[0] ?? '', setSingle}
		/>
	{/await}
{/if}
