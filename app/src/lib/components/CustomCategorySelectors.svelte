<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import EditableMultipleChoice from '$lib/components/EditableMultipleChoice.svelte';
	import { loadCategoryOptions, type CategoryOption } from '$lib/client/categoryOptions';
	import fetchContainers from '$lib/client/fetchContainers';
	import { isCategoryContainer, payloadTypes } from '$lib/models';
	import type { AnyContainer, CategoryContainer } from '$lib/models';

	interface Props {
		container: AnyContainer;
		editable?: boolean;
		organizationGuid?: string;
		includeDefaultOrganization?: boolean;
	}

	let {
		container = $bindable(),
		editable = false,
		organizationGuid,
		includeDefaultOrganization = true
	}: Props = $props();

	let categories = $state([] as CategoryContainer[]);
	let optionsByKey = $state(new Map<string, CategoryOption[]>());
	let values = $state<Record<string, string[]>>({});

	const safeKey = (key: string | undefined) => key ?? '';

	const organizationScope = $derived(() => {
		const scope = new Set<string>();
		if (organizationGuid) {
			scope.add(organizationGuid);
		} else if (page.data.currentOrganization?.guid) {
			scope.add(page.data.currentOrganization.guid);
		}
		if (includeDefaultOrganization && page.data.defaultOrganizationGuid) {
			scope.add(page.data.defaultOrganizationGuid);
		}
		return Array.from(scope.values());
	});

	onMount(async () => {
		await loadCategories();
	});

	function normalizeScope(scope: unknown): string[] {
		if (Array.isArray(scope)) return scope.filter((v): v is string => typeof v === 'string');
		if (typeof scope === 'function') {
			try {
				// Support accidentally passing a getter
				const value = (scope as () => unknown)();
				return normalizeScope(value);
			} catch (e) {
				console.error('Failed to resolve organization scope', e);
				return [];
			}
		}
		if (typeof scope === 'string') return [scope];
		return [];
	}

	async function loadCategories() {
		const orgs = normalizeScope(organizationScope);
		let all = await fetchContainers(
			{ organization: orgs, payloadType: [payloadTypes.enum.category] },
			'alpha'
		);
		let visibleCategories = all.filter(isCategoryContainer);
		let custom = visibleCategories.filter(({ payload }) => Boolean(payload.key));

		// Fallback: if no custom categories found for scoped orgs, try without org filter
		if (custom.length === 0) {
			all = await fetchContainers({ payloadType: [payloadTypes.enum.category] }, 'alpha');
			visibleCategories = all.filter(isCategoryContainer);
			custom = visibleCategories.filter(({ payload }) => Boolean(payload.key));
		}

		const keys = custom.map(({ payload }) => payload.key).filter(Boolean) as string[];
		const nextValues: Record<string, string[]> = {};
		for (const key of keys) {
			const current = (container.payload as Record<string, unknown>)[key];
			nextValues[key] = Array.isArray(current) ? (current as string[]) : [];
		}
		values = nextValues;

		categories = custom;
		if (keys.length === 0) {
			optionsByKey = new Map();
			return;
		}

		const loaded = await loadCategoryOptions(keys, orgs.length ? orgs : organizationScope);
		const next = new Map<string, CategoryOption[]>();
		for (const key of keys) {
			next.set(key, loaded[key] ?? loaded['__all__'] ?? []);
		}
		optionsByKey = next;
	}

	$effect(() => {
		for (const [key, val] of Object.entries(values)) {
			(container.payload as Record<string, unknown>)[key] = val;
		}
	});
</script>

{#if categories.length > 0}
	{#each categories as category (category.guid)}
		{@const key = safeKey(category.payload.key)}
		<EditableMultipleChoice
			editable={editable}
			label={category.payload.title ?? category.payload.key}
			options={optionsByKey.get(key) ?? []}
			bind:value={values[key]}
		/>
	{/each}
{/if}
