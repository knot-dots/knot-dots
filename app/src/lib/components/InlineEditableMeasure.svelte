<script lang="ts">
	import type { createPopover } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import tooltip from '$lib/attachments/tooltip';
	import fetchContainers from '$lib/client/fetchContainers';
	import SingleChoiceDropdown from '$lib/components/SingleChoiceDropdown.svelte';
	import {
		type AnyInitialPayload,
		type Container,
		type MeasurePayload,
		type NewContainer,
		overlayKey,
		overlayURL,
		payloadTypes,
		predicates,
		type SimpleMeasurePayload
	} from '$lib/models';

	interface Props {
		container: Container | NewContainer<AnyInitialPayload>;
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
		) as Promise<Container<MeasurePayload | SimpleMeasurePayload>[]>
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

		container.managed_by = isPartOfMeasureOptions.find(({ guid }) => guid == value)?.managed_by ?? [
			container.organizational_unit ?? container.organization
		];
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
	{#if editable}
		<SingleChoiceDropdown options={[]} value="" />
	{:else}
		<span class="badge badge--large">{$_('empty')}</span>
	{/if}
{:then measureCandidates}
	{const options = $derived([
		{ href: '', label: $_('empty'), value: '' },
		...measureCandidates.map(({ guid, payload }) => ({
			href: overlayURL(page.url, overlayKey.enum.view, guid),
			label: payload.title,
			value: guid
		}))
	])}
	{const selected = $derived(options.find((o) => o.value == isPartOfMeasureObject))}
	{#if editable}
		<SingleChoiceDropdown bind:value={() => isPartOfMeasureObject, set} {options}>
			{#snippet button(popover: ReturnType<typeof createPopover>)}
				<button
					{@attach tooltip($_('measure'))}
					class="dropdown-button module-implementation-planning"
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
		<span
			{@attach tooltip($_('measure'))}
			class="badge badge--large module-implementation-planning"
		>
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
