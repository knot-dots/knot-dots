<script lang="ts">
	import { Viewer } from 'bytemd';
	import { getContext } from 'svelte';
	import { ArrowDown, ArrowUp, Icon, Pencil, PlusSmall } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { key } from '$lib/authentication';
	import type { KeycloakContext } from '$lib/authentication';
	import {
		isModelContainer,
		isOperationalGoalContainer,
		isStrategicGoalGoalContainer,
		predicates
	} from '$lib/models';
	import type { Container, Relation } from '$lib/models';
	import { user } from '$lib/stores';

	export let container: Container;
	export let isPartOf: Container;

	const { getKeycloak } = getContext<KeycloakContext>(key);

	let isPartOfRelation: Relation[];

	$: show =
		!$page.url.searchParams.has('payloadType') ||
		$page.url.searchParams.getAll('payloadType').includes(container.payload.type);

	$: isPartOfRelation = isPartOf.relation.filter(
		({ object, predicate }) =>
			predicate == predicates.enum['is-part-of'] && object == isPartOf.revision
	);

	$: currentIndex = isPartOfRelation.findIndex(({ subject }) => container.revision == subject);

	function swap(x: number, y: number) {
		return ([...xs]) => (xs.length > 1 ? (([xs[x], xs[y]] = [xs[y], xs[x]]), xs) : xs);
	}

	function moveUp() {
		const swapCurrentPrevious = swap(currentIndex, currentIndex - 1);
		updateRelation(swapCurrentPrevious(isPartOfRelation));
	}

	function moveDown() {
		const swapCurrentNext = swap(currentIndex, currentIndex + 1);
		updateRelation(swapCurrentNext(isPartOfRelation));
	}

	async function updateRelation(relation: Relation[]) {
		// Ensure a fresh token will be included in the Authorization header.
		await getKeycloak()
			.updateToken(-1)
			.catch(() => null);

		const url = `/container/${isPartOf.guid}/relation`;

		const response = await fetch(url, {
			method: 'POST',
			body: JSON.stringify(relation),
			headers: {
				...(sessionStorage.getItem('token')
					? { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
					: undefined),
				'Content-Type': 'application/json'
			}
		});

		if (response.ok) {
			invalidateAll();
		}
	}
</script>

{#if show}
	<div class="chapter">
		<div class="content">
			<h3>
				{container.payload.title}
				{#if $user.isAuthenticated}
					{#if currentIndex < isPartOfRelation.length - 1}
						<button class="icons-element" type="button" on:click={moveDown}>
							<Icon src={ArrowDown} size="20" />
						</button>
					{/if}
					{#if currentIndex > 0}
						<button class="icons-element" type="button" on:click={moveUp}>
							<Icon src={ArrowUp} size="20" />
						</button>
					{/if}
				{/if}
			</h3>
			{#if 'body' in container.payload}
				<Viewer value={container.payload.body} />
			{/if}
			{#if 'description' in container.payload}
				<Viewer value={container.payload.description} />
			{/if}
		</div>
		<aside>
			<a class="button" href="?container-preview={container.guid}">{$_('read_more')}</a>
			{#if $user.isAuthenticated}
				{#if isModelContainer(container)}
					<a class="button primary" href="?overlay-new=text&is-part-of={container.revision}">
						<Icon src={PlusSmall} size="24" mini />
						{$_('text')}
					</a>
					<a
						class="button primary"
						href="?overlay-new=strategic_goal&is-part-of={container.revision}"
					>
						<Icon src={PlusSmall} size="24" mini />
						{$_('strategic_goal')}
					</a>
				{:else if isStrategicGoalGoalContainer(container)}
					<a class="button primary" href="?overlay-new=text&is-part-of={container.revision}">
						<Icon src={PlusSmall} size="24" mini />
						{$_('text')}
					</a>
					<a
						class="button primary"
						href="?overlay-new=operational_goal&is-part-of={container.revision}"
					>
						<Icon src={PlusSmall} size="24" mini />
						{$_('operational_goal')}
					</a>
				{:else if isOperationalGoalContainer(container)}
					<a class="button primary" href="?overlay-new=text&is-part-of={container.revision}">
						<Icon src={PlusSmall} size="24" mini />
						{$_('text')}
					</a>
					<a class="button primary" href="?overlay-new=measure&is-part-of={container.revision}">
						<Icon src={PlusSmall} size="24" mini />
						{$_('measure')}
					</a>
				{/if}
			{/if}
		</aside>
	</div>
{/if}

<style>
	h3 {
		display: flex;
		justify-content: space-between;
		font-weight: 500;
	}

	h3 button:first-of-type {
		margin-left: auto;
	}

	aside {
		align-items: flex-start;
		border-bottom: solid 1px var(--color-gray-300);
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		flex: 0 0 30%;
		gap: 1rem;
		padding: 0 1.5rem 1.5rem;
	}

	.chapter {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.content {
		flex: 1 0;
		padding: 1.5rem 1.5rem 0;
	}

	@media (min-width: 1440px) {
		aside {
			border-bottom: none;
			border-left: solid 1px var(--color-gray-300);
			flex-direction: column;
			padding: 1.5rem;
		}

		.chapter {
			flex-direction: row;
		}

		.content {
			padding: 1.5rem;
		}
	}
</style>
