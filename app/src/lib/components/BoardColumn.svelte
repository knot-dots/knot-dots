<script lang="ts">
	import { getContext, type Snippet } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Plus from '~icons/knotdots/plus';
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import DropDownMenu from '$lib/components/DropDownMenu.svelte';
	import {
		containerOfType,
		isContainerWithHierarchyLevel,
		isMeasureContainer,
		isOrganizationalUnitContainer,
		isProgramContainer,
		isGoalContainer,
		isRuleContainer,
		isTaskContainer,
		type Level,
		type NewContainer,
		type PartialRelation,
		type PayloadType,
		predicates,
		type Status
	} from '$lib/models';
	import { mayCreateContainer, newContainer } from '$lib/stores';

	interface Props {
		addItemUrl?: string;
		children: Snippet;
		createOptions?: Array<{ value: string; label: string }>;
		title: string;
		onCreateContainer?: (selectedType?: string) => void;
	}

	let { addItemUrl, children, createOptions, title, onCreateContainer }: Props = $props();

	const createContainerDialog = getContext<{ getElement: () => HTMLDialogElement }>(
		'createContainerDialog'
	);

	let addItemParams = $derived(new URLSearchParams(addItemUrl?.substring(1)));

	let mayCreate = $derived(
		addItemParams
			.getAll('create')
			.filter((t) =>
				$mayCreateContainer(
					t as PayloadType,
					addItemParams.has('managedBy')
						? (addItemParams.get('managedBy') as string)
						: (page.data.currentOrganizationalUnit?.guid ?? page.data.currentOrganization.guid)
				)
			) as PayloadType[]
	);

	// Use explicit createOptions if provided, otherwise derive from URL
	let effectiveOptions = $derived.by(() => {
		if (createOptions && createOptions.length > 0) {
			return createOptions;
		}
		// Convert mayCreate PayloadTypes to options format
		return mayCreate.map((t) => ({ value: t, label: $_(t) }));
	});

	function defaultCreateContainer(payloadType: PayloadType, params: URLSearchParams) {
		const container = containerOfType(
			payloadType,
			page.data.currentOrganization.guid,
			page.data.currentOrganizationalUnit?.guid ?? null,
			params.has('managedBy')
				? (params.get('managedBy') as string)
				: (page.data.currentOrganizationalUnit?.guid ?? page.data.currentOrganization.guid),
			env.PUBLIC_KC_REALM as string
		) as NewContainer;

		if (isOrganizationalUnitContainer(container) && params.has('level')) {
			container.payload.level = parseInt(params.get('level') as string);
		} else if (
			(isMeasureContainer(container) ||
				isRuleContainer(container) ||
				isTaskContainer(container) ||
				isGoalContainer(container)) &&
			params.has('status')
		) {
			container.payload.status = params.get('status') as Status;
		} else if (isProgramContainer(container)) {
			if (params.has('level')) {
				container.payload.level = params.get('level') as Level;
			}
			if (params.has('status')) {
				container.payload.status = params.get('status') as Status;
			}
		} else if (isContainerWithHierarchyLevel(container) && params.has('hierarchyLevel')) {
			container.payload.hierarchyLevel = parseInt(params.get('hierarchyLevel') as string);
		}

		container.relation = [
			...params.getAll(predicates.enum['is-part-of']).map(
				(o): PartialRelation => ({
					object: o,
					position: 0,
					predicate: predicates.enum['is-part-of']
				})
			),
			...params.getAll(predicates.enum['is-part-of-measure']).map(
				(o): PartialRelation => ({
					object: o,
					position: 0,
					predicate: predicates.enum['is-part-of-measure']
				})
			),
			...params.getAll(predicates.enum['is-part-of-program']).map(
				(o): PartialRelation => ({
					object: o,
					position: 0,
					predicate: predicates.enum['is-part-of-program']
				})
			)
		];

		$newContainer = container;

		createContainerDialog.getElement().showModal();
	}

	function handleCreate() {
		if (onCreateContainer) {
			onCreateContainer(effectiveOptions[0].value);
		} else {
			defaultCreateContainer(mayCreate[0], addItemParams);
		}
	}

	function handleCreateWithType(selectedValue: string) {
		if (onCreateContainer) {
			onCreateContainer(selectedValue);
		} else {
			defaultCreateContainer(selectedValue as PayloadType, addItemParams);
		}
	}
</script>

<section>
	<header>
		<h2>
			{title}
		</h2>
		{#if effectiveOptions.length === 1}
			<button class="action-button action-button--size-l" onclick={handleCreate} type="button">
				<Plus />
				<span class="is-visually-hidden">{$_('add_item')}</span>
			</button>
		{:else if effectiveOptions.length > 1}
			<DropDownMenu
				handleChange={(e) =>
					e instanceof CustomEvent && e.detail.selected && handleCreateWithType(e.detail.selected)}
				label={$_('add_item')}
				options={effectiveOptions}
			>
				{#snippet icon()}
					<Plus />
				{/snippet}
			</DropDownMenu>
		{/if}
	</header>

	{@render children()}

	{#if effectiveOptions.length > 0}
		<footer>
			{#if effectiveOptions.length === 1}
				<button onclick={handleCreate} type="button">
					<Plus />{$_('add_item')}
				</button>
			{:else if effectiveOptions.length > 1}
				<DropDownMenu
					handleChange={(e) =>
						e instanceof CustomEvent &&
						e.detail.selected &&
						handleCreateWithType(e.detail.selected)}
					label={$_('add_item')}
					options={effectiveOptions}
				>
					{#snippet icon()}
						<Plus />
					{/snippet}
				</DropDownMenu>
			{/if}
		</footer>
	{/if}
</section>

<style>
	section {
		border: var(--border, none);
		border-radius: 8px;
		display: flex;
		flex-basis: 20.75rem;
		flex-direction: column;
		flex-grow: 0;
		flex-shrink: 0;
		padding: 0.625rem 0;
	}

	section:nth-child(1) {
		background: var(--background, var(--gradient-first-column));
	}

	section:nth-child(2) {
		background: var(--background, var(--gradient-second-column));
	}

	section:nth-child(3) {
		background: var(--background, var(--gradient-third-column));
	}

	section:nth-child(4) {
		background: var(--background, var(--gradient-fourth-column));
	}

	section:nth-child(n + 5) {
		background: var(--background, var(--gradient-fifth-column));
	}

	header {
		--dropdown-button-border-radius: 8px;
		--dropdown-button-default-background: transparent;
		--dropdown-button-icon-default-color: var(--color-icon-system-default);

		align-items: center;
		display: flex;
		justify-content: space-between;
		padding: 0.25rem 0.875rem 0 1.625rem;
	}

	header h2 {
		align-items: baseline;
		display: flex;
		font-size: inherit;
		font-weight: 600;
		gap: 0.5rem;
	}

	header :global(.dropdown-button > :nth-child(n + 2)) {
		display: none;
	}

	header + :global(div) {
		flex-grow: 1;
	}

	footer {
		--dropdown-button-border-radius: 8px;
		--dropdown-button-border-width: 1px;
		--dropdown-button-default-background: var(--color-white);
		--dropdown-button-default-color: var(--color-gray-800);
		--dropdown-button-padding: 0.625rem;

		flex-shrink: 0;
		padding: 0 0.625rem;
	}

	footer :global(.dropdown) {
		width: 100%;
	}

	footer :global(.dropdown-button) {
		justify-content: center;
	}

	footer > button {
		--button-background: var(--color-white);

		justify-content: center;
		padding: var(--dropdown-button-padding);
		width: 100%;
	}
</style>
