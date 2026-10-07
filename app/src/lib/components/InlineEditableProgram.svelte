<script lang="ts">
	import type { createPopover } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import tooltip from '$lib/attachments/tooltip';
	import fetchContainers from '$lib/client/fetchContainers';
	import MultipleChoiceDropdown from '$lib/components/MultipleChoiceDropdown.svelte';
	import SingleChoiceDropdown from '$lib/components/SingleChoiceDropdown.svelte';
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

	async function setSingle(value: string) {
		await set(value ? [value] : []);
	}
</script>

{#if createFeatureDecisions(page.data.features).useMultipleProgramAssignment()}
	{#await programCandidatesRequest}
		{#if editable}
			<MultipleChoiceDropdown options={[]} value={[]} />
		{:else}
			<span class="badge badge--large module-goal-setting">{$_('empty')}</span>
		{/if}
	{:then programCandidates}
		{const options = $derived(
			programCandidates.map((candidate) => ({
				group: groupName(candidate),
				href: overlayURL(page.url, overlayKey.enum.view, candidate.guid),
				label: candidate.payload.title,
				value: candidate.guid
			}))
		)}
		{const selected = $derived(options.filter((o) => isPartOfProgramObjects.includes(o.value)))}
		{#if editable}
			<MultipleChoiceDropdown {options} bind:value={() => isPartOfProgramObjects, set}>
				{#snippet button(popover)}
					<button
						{@attach tooltip($_('program'))}
						class="dropdown-button dropdown-button--select module-goal-setting"
						type="button"
						use:popover.button
					>
						{#each selected as selectedOption (selectedOption.value)}
							<span class="badge badge--large">
								<span class="truncated">{selectedOption.label}</span>
							</span>
						{:else}
							<span class="badge badge--large">{$_('empty')}</span>
						{/each}
					</button>
				{/snippet}
			</MultipleChoiceDropdown>
		{:else}
			<ul {@attach tooltip($_('program'))} class="value module-goal-setting">
				{#each selected as selectedOption (selectedOption.value)}
					<li class="badge badge--large">
						<a href={overlayURL(page.url, overlayKey.enum.view, selectedOption.value)}>
							<span class="truncated">{selectedOption.label}</span>
						</a>
					</li>
				{:else}
					<li class="badge badge--large">{$_('empty')}</li>
				{/each}
			</ul>
		{/if}
	{/await}
{:else}
	{#await programCandidatesRequest}
		{#if editable}
			<SingleChoiceDropdown options={[]} value="" />
		{:else}
			<span class="badge badge--large module-goal-setting">{$_('empty')}</span>
		{/if}
	{:then programCandidates}
		{const options = $derived([
			{ href: '', label: $_('empty'), value: '' },
			...programCandidates.map(({ guid, payload }) => ({
				href: overlayURL(page.url, overlayKey.enum.view, guid),
				label: payload.title,
				value: guid
			}))
		])}
		{const selected = $derived(options.find((o) => o.value == isPartOfProgramObjects[0]))}
		{#if editable}
			<SingleChoiceDropdown {options} bind:value={() => isPartOfProgramObjects[0] ?? '', setSingle}>
				{#snippet button(popover: ReturnType<typeof createPopover>)}
					<button
						{@attach tooltip($_('program'))}
						class="dropdown-button module-goal-setting"
						type="button"
						use:popover.button
					>
						<span class="badge badge--large truncated">
							{#if selected}{selected.label}{:else}{$_('empty')}{/if}
						</span>
					</button>
				{/snippet}
			</SingleChoiceDropdown>
		{:else}
			<span {@attach tooltip($_('program'))} class="badge badge--large module-goal-setting">
				{#if selected}
					{#if selected.href}
						<a href={selected.href}>{selected.label}</a>
					{:else}
						{selected.label}
					{/if}
				{:else}
					{$_('empty')}
				{/if}
			</span>
		{/if}
	{/await}
{/if}

<style>
	.badge {
		min-width: 0;
	}

	.value {
		display: flex;
		flex-wrap: nowrap;
	}
</style>
