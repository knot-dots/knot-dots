<script lang="ts">
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import PlusSmall from '~icons/heroicons/plus-small-solid';
	import { env } from '$env/dynamic/public';
	import { page } from '$app/state';
	import { createFeatureDecisions } from '$lib/features';
	import {
		containerOfType,
		isGoalContainer,
		isMeasureContainer,
		isOrganizationalUnitContainer,
		isResolutionContainer,
		isTaskContainer,
		type NewContainer,
		overlayKey,
		type PartialRelation,
		type PayloadType,
		predicates,
		resolutionStatus,
		type ResolutionStatus,
		type Status,
		taskStatus,
		type TaskStatus
	} from '$lib/models';
	import { newContainer } from '$lib/stores';

	export let title: string;
	export let addItemUrl: string | undefined = undefined;

	const createContainerDialog = getContext<{ getElement: () => HTMLDialogElement }>(
		'createContainerDialog'
	);

	function createContainer(event: Event) {
		event.preventDefault();

		const params = new URLSearchParams(
			(event.currentTarget as HTMLAnchorElement).hash.substring(1)
		);

		const container = containerOfType(
			params.get(overlayKey.enum.create) as PayloadType,
			page.data.currentOrganization.guid,
			page.data.currentOrganizationalUnit?.guid ?? null,
			page.data.currentOrganizationalUnit?.guid ?? page.data.currentOrganization.guid,
			env.PUBLIC_KC_REALM as string
		) as NewContainer;

		if (isOrganizationalUnitContainer(container) && params.has('level')) {
			container.payload.level = parseInt(params.get('level') as string);
		} else if (isResolutionContainer(container) && params.has('resolutionStatus')) {
			container.payload.resolutionStatus = params.get('resolutionStatus') as ResolutionStatus;
		} else if (isMeasureContainer(container) && params.has('status')) {
			container.payload.status = params.get('status') as Status;
		} else if (isTaskContainer(container) && params.has('taskStatus')) {
			container.payload.taskStatus = params.get('taskStatus') as TaskStatus;
		} else if (isGoalContainer(container) && params.has('hierarchyLevel')) {
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
			)
		];

		$newContainer = container;

		createContainerDialog.getElement().showModal();
	}
</script>

<section>
	<header>
		<h2>
			{title}
		</h2>
		{#if addItemUrl}
			{#if createFeatureDecisions(page.data.features).useEditableDetailView()}
				<a href={addItemUrl} onclick={createContainer} title={$_('add_item')}><PlusSmall /></a>
			{:else}
				<a href={addItemUrl} title={$_('add_item')}><PlusSmall /></a>
			{/if}
		{/if}
	</header>

	<slot />

	{#if addItemUrl}
		<footer>
			{#if createFeatureDecisions(page.data.features).useEditableDetailView()}
				<a href={addItemUrl} onclick={createContainer}>{$_('add_item')}<PlusSmall /></a>
			{:else}
				<a href={addItemUrl}>{$_('add_item')}<PlusSmall /></a>
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
		padding: 0.625rem;
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
		align-items: center;
		color: var(--color-gray-800);
		display: flex;
		justify-content: space-between;
		padding: 0.25rem 0.625rem 0;
	}

	header h2 {
		align-items: baseline;
		display: flex;
		font-size: inherit;
		font-weight: 700;
		gap: 0.5rem;
	}

	:global(header svg) {
		stroke-width: 2.5px;
	}

	footer {
		background-color: #ffffff;
		border: 1px solid var(--color-gray-200);
		border-radius: 8px;
		box-shadow: var(--shadow-sm);
		flex-shrink: 0;
		overflow: hidden;
	}

	footer:hover {
		background-color: var(--color-gray-100);
	}

	footer a {
		align-items: center;
		display: flex;
		gap: 0.5rem;
		justify-content: center;
		padding: 10px 20px;
		text-align: center;
		width: 100%;
	}
</style>
