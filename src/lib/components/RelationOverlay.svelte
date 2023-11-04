<script lang="ts">
	import { dndzone, TRIGGERS } from 'svelte-dnd-action';
	import type { DndEvent } from 'svelte-dnd-action';
	import { Icon, Trash, XMark } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import { slide } from 'svelte/transition';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import saveContainer from '$lib/client/saveContainer';
	import { predicates } from '$lib/models';
	import type { AnyContainer, Container, Predicate } from '$lib/models';
	import { dragged } from '$lib/stores';
	import { predicateIcons } from '$lib/theme/models';

	export let object: AnyContainer;

	type DropZone = {
		active: boolean;
		help: string;
		items: { guid: string; container: Container }[];
		predicate: Predicate;
	};

	const dropZones: DropZone[] = [
		{
			active: false,
			items: [],
			help: $_('relation_overlay.is_consistent_with'),
			predicate: predicates.enum['is-consistent-with']
		},
		{
			active: false,
			items: [],
			help: $_('relation_overlay.is_inconsistent_with'),
			predicate: predicates.enum['is-inconsistent-with']
		},
		{
			active: false,
			items: [],
			help: $_('relation_overlay.is_equivalent_to'),
			predicate: predicates.enum['is-equivalent-to']
		},
		{
			active: false,
			items: [],
			help: $_('relation_overlay.is_duplicate_of'),
			predicate: predicates.enum['is-duplicate-of']
		}
	];

	function closeOverlay() {
		return `#view=${object.guid}`;
	}

	let activeDropZoneIndex = -1;

	function handleDndConsider(
		index: number,
		event: CustomEvent<DndEvent<{ guid: string; container: Container }>>
	) {
		if (event.detail.info.trigger === TRIGGERS.DRAGGED_ENTERED) {
			activeDropZoneIndex = index;
		} else if (event.detail.info.trigger === TRIGGERS.DRAGGED_LEFT) {
			activeDropZoneIndex = -1;
		}
		dropZones[index].items = event.detail.items;
	}

	function handleDndFinalize(
		index: number,
		event: CustomEvent<DndEvent<{ guid: string; container: Container }>>
	) {
		if (event.detail.info.trigger === TRIGGERS.DROPPED_INTO_ZONE && $dragged) {
			$dragged.relation.push({
				object: object.revision,
				position: 0,
				predicate: dropZones[index].predicate,
				subject: $dragged.revision
			});
			dropZones[index].active = true;
			setTimeout(() => {
				dropZones[index].active = false;
				activeDropZoneIndex = -1;
			}, 2000);
			saveContainer({ ...$dragged, guid: $dragged.guid.split('_')[0] });
		}
	}

	const unrelateZone = {
		active: false,
		considered: false,
		items: [] as { guid: string; container: Container }[]
	};

	function handleUnrelateConsider(
		event: CustomEvent<DndEvent<{ guid: string; container: Container }>>
	) {
		if (event.detail.info.trigger === TRIGGERS.DRAGGED_ENTERED) {
			unrelateZone.considered = true;
		} else if (event.detail.info.trigger === TRIGGERS.DRAGGED_LEFT) {
			unrelateZone.considered = false;
		}
		unrelateZone.items = event.detail.items;
	}

	function handleUnrelateFinalize(
		event: CustomEvent<DndEvent<{ guid: string; container: Container }>>
	) {
		if (event.detail.info.trigger === TRIGGERS.DROPPED_INTO_ZONE && $dragged) {
			$dragged.relation = $dragged.relation.filter(
				(relation) =>
					(relation.predicate != predicates.enum['is-consistent-with'] &&
						relation.predicate != predicates.enum['is-duplicate-of'] &&
						relation.predicate != predicates.enum['is-equivalent-to'] &&
						relation.predicate != predicates.enum['is-inconsistent-with']) ||
					(relation.object != object.revision && relation.subject != object.revision)
			);
			unrelateZone.active = true;
			setTimeout(() => {
				unrelateZone.active = false;
				unrelateZone.considered = false;
			}, 2000);
			saveContainer({ ...$dragged, guid: $dragged.guid.split('_')[0] });
			invalidateAll();
		}
	}
</script>

<div class="overlay" transition:slide={{ axis: 'x' }}>
	<div class="details">
		<header>
			<h2>
				<span class="icons">
					<a href={closeOverlay()} class="button icons-element">
						<Icon solid src={XMark} size="20" />
					</a>
				</span>
			</h2>
		</header>
		<p>
			{$_('relation_overlay.help', {
				values: {
					type: $_(object.payload.type),
					nameOrTitle: 'title' in object.payload ? object.payload.title : object.payload.name
				}
			})}
		</p>

		{#each dropZones as zone, i (zone.predicate)}
			<div class="drop-zone-wrapper">
				<Icon src={predicateIcons.get(zone.predicate)} size="24" />
				{zone.help}
				<div
					class="drop-zone drop-zone--{zone.predicate}"
					class:drop-zone--is-active={i === activeDropZoneIndex}
					class:drop-zone--has-received={zone.active}
					use:dndzone={{
						dropTargetStyle: {},
						items: zone.items,
						morphDisabled: true
					}}
					on:consider={(e) => handleDndConsider(i, e)}
					on:finalize={(e) => handleDndFinalize(i, e)}
				>
					{#each zone.items as item (item.guid)}
						<span>{item.guid}</span>
					{/each}
				</div>
			</div>
		{/each}

		<div class="drop-zone-wrapper">
			<Icon src={Trash} size="24" />
			{$_('relation_overlay.remove')}
			<div
				class="drop-zone drop-zone--remove"
				class:drop-zone--is-active={unrelateZone.considered}
				class:drop-zone--has-received={unrelateZone.active}
				use:dndzone={{
					dropTargetStyle: {},
					items: unrelateZone.items,
					morphDisabled: true
				}}
				on:consider={handleUnrelateConsider}
				on:finalize={handleUnrelateFinalize}
			>
				{#each unrelateZone.items as item (item.guid)}
					<span>{item.guid}</span>
				{/each}
			</div>
		</div>

		<footer>
			<a class="button" href={$page.url.pathname}>{$_('relation_overlay.close')}</a>
			<a class="button" href={`?related-to=${object.guid}`}
				>{$_('relation_overlay.close_and_show_relations')}</a
			>
		</footer>
	</div>
</div>

<style>
	@media (min-width: 768px) {
		.overlay {
			width: 50%;
		}

		.overlay > :global(*) {
			min-width: calc((100vw - 18rem) * 0.5);
		}
	}

	.details {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.details > p {
		padding: 0 1.5rem;
	}

	.drop-zone-wrapper {
		background-color: var(--color-gray-050);
		color: var(--color-gray-500);
		padding: 1rem;
		position: relative;
		margin: 0 1.5rem;
		stroke: var(--color-gray-500);
		text-align: center;
	}

	.drop-zone-wrapper > :global(svg) {
		margin: 0 auto 0.5rem;
		stroke-width: 2.5px;
	}

	.drop-zone {
		border-radius: 8px;
		bottom: 0;
		left: 0;
		outline: dashed 2px var(--color-is-duplicate-of);
		position: absolute;
		right: 0;
		top: 0;
	}

	.drop-zone.drop-zone--is-active {
		outline-style: solid;
		outline-width: 3px;
	}

	.drop-zone.drop-zone--has-received {
		outline-style: solid;
	}

	.drop-zone.drop-zone--is-consistent-with {
		outline-color: var(--color-is-consistent-with);
	}

	.drop-zone.drop-zone--is-inconsistent-with {
		outline-color: var(--color-is-inconsistent-with);
	}

	.drop-zone.drop-zone--is-equivalent-to {
		outline-color: var(--color-is-equivalent-to);
	}
</style>
