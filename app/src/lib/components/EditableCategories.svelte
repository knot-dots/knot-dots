<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import type { CategoryOption } from '$lib/categoryOptions';
	import { categoryMatchesObjectTypes, loadCategoryOptions } from '$lib/client/categoryOptions';
	import fetchContainers from '$lib/client/fetchContainers';
	import CustomCategoryDropdown from '$lib/components/CustomCategoryDropdown.svelte';
	import { isCategoryContainer, payloadTypes } from '$lib/models';
	import type { AnyContainer, CategoryContainer } from '$lib/models';

	interface Props {
		container: AnyContainer & { payload: { category: Record<string, string[]> } };
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

	function normalizeScope(scope: unknown): string[] {
		if (Array.isArray(scope)) return scope.filter((v): v is string => typeof v === 'string');
		if (typeof scope === 'function') {
			try {
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

	onMount(async () => {
		await loadCategories();
	});

	async function loadCategories() {
		const orgs = normalizeScope(organizationScope);
		const all = await fetchContainers(
			{ payloadType: [payloadTypes.enum.category], organization: orgs.length ? orgs : undefined },
			'alpha'
		);
		const visibleCategories = all.filter(isCategoryContainer);

		const payloadType = (container.payload as Record<string, unknown>).type;
		const custom = visibleCategories
			.filter(({ payload }) => Boolean(payload.key))
			.filter((category) =>
				!payloadType ? true : categoryMatchesObjectTypes(category, [String(payloadType)])
			);

		const payload = container.payload as Record<string, unknown>;
		if (!payload.category || Array.isArray(payload.category)) {
			payload.category = {};
		}
		const categoryMap = payload.category as Record<string, unknown>;
		const keys = custom.map(({ payload }) => payload.key).filter(Boolean) as string[];
		for (const key of keys) {
			const current = categoryMap[key];
			if (!Array.isArray(current)) {
				categoryMap[key] = [];
			}
		}
		categories = custom;
		if (keys.length === 0) {
			optionsByKey = new Map();
			return;
		}

		const loaded = await loadCategoryOptions(keys, orgs, payloadType ? [String(payloadType)] : []);
		const next = new Map<string, CategoryOption[]>();
		for (const key of keys) {
			next.set(key, loaded[key] ?? []);
		}
		optionsByKey = next;
	}
</script>

{#if categories.length > 0}
	{#each categories as category (category.guid)}
		{@const key = safeKey(category.payload.key)}
		{#if key}
			{@const id = crypto.randomUUID()}
			<div class="label" {id}>{category.payload.title ?? category.payload.key}</div>
			<CustomCategoryDropdown
				bind:value={container.payload.category[key]}
				{editable}
				labelledBy={id}
				options={optionsByKey.get(key) ?? []}
			/>
		{/if}
	{/each}
{/if}
