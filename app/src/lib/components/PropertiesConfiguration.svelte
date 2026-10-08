<script lang="ts">
	import { flip } from 'svelte/animate';
	import { type DndEvent, dndzone } from 'svelte-dnd-action';
	import { _ } from 'svelte-i18n';
	import type { ZodObject } from 'zod';
	import DragHandle from '~icons/knotdots/draghandle';
	import { invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import saveContainer from '$lib/client/saveContainer';
	import { type AnyPayload, type Container, payloadRegistry, propertyRegistry } from '$lib/models';

	interface Props {
		configuration: { headerAndPanel: string[]; onlyPanel: string[]; unused: string[] };
		container: Container<AnyPayload>;
		payloadSchema: ZodObject;
	}

	let { configuration, container, payloadSchema }: Props = $props();

	let organization = $derived(page.data.currentOrganization);

	const defaultLayout = $derived(
		payloadRegistry.get(payloadSchema)?.layout?.detail ?? {
			headerAndPanel: [],
			onlyPanel: [],
			unused: []
		}
	);

	let headerAndPanelItems = $derived(configuration.headerAndPanel.map((key) => ({ guid: key })));

	let onlyPanelItems = $derived(configuration.onlyPanel.map((key) => ({ guid: key })));

	let unusedItems = $derived.by(() => {
		const knownKeys = new Set([
			...configuration.headerAndPanel,
			...configuration.onlyPanel,
			...configuration.unused
		]);

		const missingDefaultKeys = [
			...defaultLayout.headerAndPanel,
			...defaultLayout.onlyPanel,
			...defaultLayout.unused
		].filter((key) => !knownKeys.has(key));

		const applicableCategories = (page.data.categoryContext?.keys ?? [])
			.filter((key: string) =>
				page.data.categoryContext?.objectTypesPerKey?.[key]?.includes(container.payload.type)
			)
			.map((key: string) => `category.${key}`)
			.filter((key: string) => !knownKeys.has(key) && !missingDefaultKeys.includes(key));

		const allUnusedKeys = [...configuration.unused, ...missingDefaultKeys, ...applicableCategories];

		return allUnusedKeys.map((key) => ({ guid: key }));
	});

	function getItemLabel(item: string): string {
		if (item == 'created') {
			return $_('created_date');
		}
		if (item.startsWith('category.')) {
			const key = item.slice(9);
			return page.data.categoryContext?.labels?.get(key) ?? key;
		}
		if (item === 'measure') {
			return $_('measure');
		}
		if (item === 'modified') {
			return $_('modified_date');
		}
		if (item === 'organization') {
			return $_('organization');
		}
		if (item === 'organizational_unit') {
			return $_('organizational_unit');
		}
		if (item === 'parent') {
			return $_('superordinate_element');
		}
		if (item === 'program') {
			return $_('program');
		}
		if (item === 'status') {
			return $_('status');
		}
		if (item in payloadSchema.shape) {
			const schema = payloadSchema.shape[item as keyof typeof payloadSchema.shape];
			const meta = propertyRegistry.get(schema);
			if (meta?.label) {
				return $_(meta.label);
			}
		}
		return item;
	}

	function handleConsider(section: 'headerAndPanel' | 'onlyPanel' | 'unused') {
		return (e: CustomEvent<DndEvent<{ guid: string }>>) => {
			if (section === 'headerAndPanel') {
				headerAndPanelItems = e.detail.items;
			} else if (section === 'onlyPanel') {
				onlyPanelItems = e.detail.items;
			} else if (section === 'unused') {
				unusedItems = e.detail.items;
			}
		};
	}

	function handleFinalize(section: 'headerAndPanel' | 'onlyPanel' | 'unused') {
		return async (e: CustomEvent<DndEvent<{ guid: string }>>) => {
			if (section === 'headerAndPanel') {
				headerAndPanelItems = e.detail.items;
			} else if (section === 'onlyPanel') {
				onlyPanelItems = e.detail.items;
			} else if (section === 'unused') {
				unusedItems = e.detail.items;
			}

			scheduleSaveConfiguration();
		};
	}

	let saveTimeout: ReturnType<typeof setTimeout> | undefined;

	function scheduleSaveConfiguration() {
		if (saveTimeout) clearTimeout(saveTimeout);
		saveTimeout = setTimeout(async () => {
			await saveConfiguration();
		}, 100);
	}

	async function saveConfiguration() {
		organization.payload.propertiesConfiguration[container.payload.type] = {
			headerAndPanel: headerAndPanelItems.map((item) => item.guid),
			onlyPanel: onlyPanelItems.map((item) => item.guid),
			unused: unusedItems.map((item) => item.guid)
		};

		const response = await saveContainer(organization);
		if (response.ok) {
			const updatedContainer = await response.json();
			organization.revision = updatedContainer.revision;
			await invalidate('organization');
		} else {
			const error = await response.json();
			alert(error.message);
		}
	}
</script>

<div>
	<h3>{$_('properties.configuration.header_and_panel')}</h3>
	<ul
		onconsider={handleConsider('headerAndPanel')}
		onfinalize={handleFinalize('headerAndPanel')}
		use:dndzone={{
			dropTargetStyle: {},
			flipDurationMs: 100,
			items: headerAndPanelItems,
			type: 'property'
		}}
	>
		{#each headerAndPanelItems as item (item.guid)}
			<li animate:flip={{ duration: 100 }}>
				<DragHandle />
				<span class="truncated">{getItemLabel(item.guid)}</span>
			</li>
		{/each}
	</ul>

	<h3>{$_('properties.configuration.only_panel')}</h3>
	<ul
		onconsider={handleConsider('onlyPanel')}
		onfinalize={handleFinalize('onlyPanel')}
		use:dndzone={{
			dropTargetStyle: {},
			flipDurationMs: 100,
			items: onlyPanelItems,
			type: 'property'
		}}
	>
		{#each onlyPanelItems as item (item.guid)}
			<li animate:flip={{ duration: 100 }}>
				<DragHandle />
				<span class="truncated">{getItemLabel(item.guid)}</span>
			</li>
		{/each}
	</ul>

	<h3>{$_('properties.configuration.unused')}</h3>
	<ul
		onconsider={handleConsider('unused')}
		onfinalize={handleFinalize('unused')}
		use:dndzone={{
			dropTargetStyle: {},
			flipDurationMs: 100,
			items: unusedItems,
			type: 'property'
		}}
	>
		{#each unusedItems as item (item.guid)}
			<li animate:flip={{ duration: 100 }}>
				<DragHandle />
				<span class="truncated">{getItemLabel(item.guid)}</span>
			</li>
		{/each}
	</ul>
</div>

<style>
	h3 {
		color: var(--color-text-accent-subtle);
		font-size: 0.875rem;
		font-weight: 500;
		margin-bottom: 0.5rem;
		padding-left: 0.5rem;
	}

	ul {
		display: flex;
		flex-direction: column;
		font-size: 0.875rem;
		font-weight: 400;
		gap: 0.5rem;
		margin-bottom: 1rem;
		min-height: 2.5rem;
		padding: 0;
	}

	ul:empty {
		border: 1px dashed var(--color-border-subtle);
		border-radius: 8px;
	}

	li {
		align-items: center;
		background: var(--color-background-accent-muted);
		border: 1px solid var(--color-border-accent-subtle);
		border-radius: 8px;
		display: flex;
		gap: 0.5rem;
		line-height: 1.2;
		min-height: 2.5rem;
		padding: 0.375rem 0.375rem 0.375rem 0.75rem;
		user-select: none;
	}

	li > :global(svg) {
		flex: 0 0 auto;
		height: 1rem;
		width: 1rem;
	}

	li > span {
		color: var(--color-text-accent-default);
		flex: 1 0 0;
	}
</style>
