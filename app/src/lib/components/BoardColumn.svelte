<script lang="ts">
	import { getContext, type Snippet } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Plus from '~icons/knotdots/plus';
	import { env } from '$env/dynamic/public';
	import { page } from '$app/state';
	import {
		containerOfType,
		type GoalStatus,
		isGoalContainer,
		isMeasureContainer,
		isOrganizationalUnitContainer,
		isProgramContainer,
		isRuleContainer,
		isTaskContainer,
		type Level,
		type NewContainer,
		type PartialRelation,
		type PayloadType,
		predicates,
		type ProgramStatus,
		type RuleStatus,
		type Status,
		type TaskStatus
	} from '$lib/models';
	import { mayCreateContainer, newContainer } from '$lib/stores';

	interface Props {
		addItemUrl?: string;
		children: Snippet;
		title: string;
	}

	let { addItemUrl, children, title }: Props = $props();

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
					page.data.currentOrganizationalUnit?.guid ?? page.data.currentOrganization.guid
				)
			) as PayloadType[]
	);

	function createContainer(payloadType: PayloadType, params: URLSearchParams) {
		const container = containerOfType(
			payloadType,
			page.data.currentOrganization.guid,
			page.data.currentOrganizationalUnit?.guid ?? null,
			page.data.currentOrganizationalUnit?.guid ?? page.data.currentOrganization.guid,
			env.PUBLIC_KC_REALM as string
		) as NewContainer;

		if (isOrganizationalUnitContainer(container) && params.has('level')) {
			container.payload.level = parseInt(params.get('level') as string);
		} else if (isRuleContainer(container) && params.has('ruleStatus')) {
			container.payload.ruleStatus = params.get('ruleStatus') as RuleStatus;
		} else if (isMeasureContainer(container) && params.has('status')) {
			container.payload.status = params.get('status') as Status;
		} else if (isTaskContainer(container) && params.has('taskStatus')) {
			container.payload.taskStatus = params.get('taskStatus') as TaskStatus;
		} else if (isGoalContainer(container)) {
			if (params.has('hierarchyLevel')) {
				container.payload.hierarchyLevel = parseInt(params.get('hierarchyLevel') as string);
			}
			if (params.has('goalStatus')) {
				container.payload.goalStatus = params.get('goalStatus') as GoalStatus;
			}
		} else if (isProgramContainer(container)) {
			if (params.has('level')) {
				container.payload.level = params.get('level') as Level;
			}
			if (params.has('programStatus')) {
				container.payload.programStatus = params.get('programStatus') as ProgramStatus;
			}
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
		{#if mayCreate.length === 1}
			<button
				class="action-button action-button--size-l"
				onclick={() => createContainer(mayCreate[0], addItemParams)}
				type="button"
			>
				<Plus />
				<span class="is-visually-hidden">{$_('add_item')}</span>
			</button>
		{/if}
	</header>

	{@render children()}

	{#if mayCreate.length > 0}
		<footer>
			{#if addItemParams.getAll('create').length === 1}
				<button onclick={() => createContainer(mayCreate[0], addItemParams)} type="button">
					<Plus />{$_('add_item')}
				</button>
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

	header + :global(div) {
		flex-grow: 1;
	}

	.action-button {
		color: inherit;
	}

	.action-button,
	.action-button:hover,
	.action-button:active {
		background-color: transparent;
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
