<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import { createIsPartOfOptionsRequest } from '$lib/client/isPartOfOptions';
	import SingleChoiceDropdown from '$lib/components/SingleChoiceDropdown.svelte';
	import {
		type Container,
		type EmptyContainer,
		findDescendants,
		overlayKey,
		overlayURL,
		payloadTypes,
		predicates
	} from '$lib/models';

	interface Props {
		container: Container | EmptyContainer;
		editable?: boolean;
		offset?: [number, number];
	}

	let { container = $bindable(), editable = false, offset = [0, 4] }: Props = $props();

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
	let payloadType = $derived(container.payload.type ?? payloadTypes.enum.undefined);

	let isPartOfOptionsRequest = $derived(
		createIsPartOfOptionsRequest(payloadType, container.organization, measureGuid, programGuid)
	);

	let isPartOfObject = $derived(
		(options: Array<{ value: string }>) =>
			container.relation.find(
				(r) =>
					r.predicate === predicates.enum['is-part-of'] &&
					options.some(({ value }) => value === r.object)
			)?.object ?? ''
	);

	function set(value: string) {
		const idx = container.relation.findIndex(
			({ predicate, subject }) =>
				predicate === predicates.enum['is-part-of'] &&
				('guid' in container ? subject === container.guid : true)
		);
		const next = [
			...container.relation.slice(0, idx),
			...(value
				? [
						{
							object: value,
							position: 0,
							predicate: predicates.enum['is-part-of'],
							...('guid' in container ? { subject: container.guid } : {})
						}
					]
				: []),
			...container.relation.slice(idx + 1)
		];
		// Avoid pointless reassignment
		if (
			next.length === container.relation.length &&
			next.every((r, i) => r === container.relation[i])
		)
			return;
		container.relation = next;
	}
</script>

{#await isPartOfOptionsRequest}
	<SingleChoiceDropdown options={[]} bind:value={() => isPartOfObject([]), set} />
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
			.filter(
				({ organizational_unit }) =>
					!container.organizational_unit || organizational_unit === container.organizational_unit
			)
			.filter(({ relation }) =>
				programGuid
					? relation.some(
							({ object, predicate }) =>
								predicate === predicates.enum['is-part-of-program'] && object === programGuid
						)
					: measureGuid
						? relation.some(
								({ object, predicate }) =>
									predicate === predicates.enum['is-part-of-measure'] && object === measureGuid
							)
						: true
			)
			.map(({ guid, payload }) => ({
				href: overlayURL(page.url, overlayKey.enum.view, guid),
				label: payload.title,
				value: guid
			}))
	]}
	{#if editable}
		<SingleChoiceDropdown {offset} {options} bind:value={() => isPartOfObject(options), set} />
	{:else}
		{@const selected = options.find((o) => o.value === isPartOfObject(options))}
		<div class="value">
			{#if selected}
				{#if 'href' in selected && selected.href}
					<a href={selected.href}>{selected.label}</a>
				{:else}
					{selected.label}
				{/if}
			{:else}
				{$_('empty')}
			{/if}
		</div>
	{/if}
{/await}
