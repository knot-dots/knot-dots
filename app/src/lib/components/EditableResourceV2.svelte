<script lang="ts">
	import { _ } from 'svelte-i18n';
	import fetchContainers from '$lib/client/fetchContainers';
	import GroupedSingleChoiceDropdown from '$lib/components/GroupedSingleChoiceDropdown.svelte';
	import {
		type Container,
		isContainerWithPayloadType,
		payloadTypes,
		resourceCategories,
		type ResourceV2Payload
	} from '$lib/models';

	interface Props {
		editable?: boolean;
		required?: boolean;
		labelKey?: string;
		name?: string;
		value: string | null | undefined;
	}

	let {
		editable = false,
		required = false,
		labelKey = 'resource',
		name = 'resource',
		value = $bindable()
	}: Props = $props();

	let resources = $state<Container<ResourceV2Payload>[]>([]);
	let groupedResources = $derived.by(() => {
		const byCategory = new Map<string, Container<ResourceV2Payload>[]>();
		for (const r of resources) {
			const key = r.payload.resourceCategory;
			const existing = byCategory.get(key);
			if (existing) existing.push(r);
			else byCategory.set(key, [r]);
		}

		return resourceCategories.options
			.map((category) => {
				const items = (byCategory.get(category) ?? [])
					.slice()
					.sort((a, b) => a.payload.title.localeCompare(b.payload.title));
				return {
					title: $_(category),
					options: items.map((r) => ({
						label: `${r.payload.title} (in ${$_(r.payload.resourceUnit)})`,
						value: r.guid
					}))
				};
			})
			.filter((g) => g.options.length > 0);
	});

	$effect(() => {
		let cancelled = false;
		(async () => {
			const result = await fetchContainers(
				{ payloadType: [payloadTypes.enum.resource_v2] },
				'alpha'
			);
			if (cancelled) return;
			resources = result.filter((c) =>
				isContainerWithPayloadType(payloadTypes.enum.resource_v2, c)
			);
		})();

		return () => {
			cancelled = true;
		};
	});

	const id = crypto.randomUUID();
</script>

<div class="label" {id}>{$_(labelKey)}</div>
{#if editable}
	<GroupedSingleChoiceDropdown
		{name}
		labelledBy={id}
		groups={groupedResources}
		{required}
		bind:value
	/>
{:else}
	<div class="value">
		{resources.find((r) => r.guid === value)?.payload.title ?? $_('none')}
	</div>
{/if}
