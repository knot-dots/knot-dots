<script lang="ts">
	import { dndzone, TRIGGERS } from 'svelte-dnd-action';
	import type { DndEvent } from 'svelte-dnd-action';
	import { _ } from 'svelte-i18n';
	import { slide } from 'svelte/transition';
	import Trash from '~icons/heroicons/trash';
	import XMark from '~icons/heroicons/x-mark-20-solid';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import saveContainer from '$lib/client/saveContainer';
	import { predicates } from '$lib/models';
	import type { AnyContainer, Container, Predicate } from '$lib/models';
	import { dragged, overlayHistory, relationOverlayWidth } from '$lib/stores';
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

	async function close() {
		if ($overlayHistory.length > 1) {
			$overlayHistory = $overlayHistory.slice(0, $overlayHistory.length - 1);
			const newParams = $overlayHistory[$overlayHistory.length - 1] as URLSearchParams;
			await goto(`#${newParams.toString()}`);
		} else {
			await goto(`#`);
		}
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

	let offset = 0;

	function startExpand(event: MouseEvent) {
		offset = event.offsetX - 12;
		window.addEventListener('mousemove', expand);
	}

	function stopExpand() {
		window.removeEventListener('mousemove', expand);
	}

	function expand(event: MouseEvent) {
		$relationOverlayWidth = (window.innerWidth - event.pageX + offset) / window.innerWidth;

		if ($relationOverlayWidth * window.innerWidth < 320) {
			$relationOverlayWidth = 320 / window.innerWidth;
		} else if ($relationOverlayWidth * window.innerWidth > window.innerWidth - 400) {
			$relationOverlayWidth = 1 - 400 / window.innerWidth;
		}
	}
</script>

<svelte:window on:mouseup={stopExpand} />

<section
	class="overlay"
	style="--width-factor: {$relationOverlayWidth}"
	transition:slide={{ axis: 'x' }}
>
	<!--svelte-ignore a11y-no-static-element-interactions -->
	<div class="resize-handle" on:mousedown|preventDefault={startExpand} />
	<header class="content-header">
		<h2>
			<button class="quiet" on:click={() => close()}>
				<XMark />
			</button>
		</h2>
	</header>
	<div class="content-details">
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
				<svelte:component this={predicateIcons.get(zone.predicate)} />
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
			<Trash />
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

		<footer class="content-footer">
			<div class="content-actions">
				<a class="button" href={$page.url.pathname}>{$_('relation_overlay.close')}</a>
				<a class="button" href={`?related-to=${object.guid}`}>
					{$_('relation_overlay.close_and_show_relations')}
				</a>
			</div>
		</footer>
	</div>
</section>

<style>
	@media (min-width: 768px) {
		.overlay {
			--width-factor: 0.5;

			width: calc(100% * var(--width-factor));
		}

		.overlay > * {
			min-width: calc(100vw * var(--width-factor) - 3.5rem);
		}

		.overlay > :global(nav) {
			min-width: calc(100vw * var(--width-factor));
		}
	}

	.content-header,
	.content-details,
	.content-footer {
		padding-left: 1.5rem;
	}

	.content-details {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.content-details > p {
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

	.resize-handle {
		background-image: url(/src/lib/assets/resize-handle.svg);
		background-position: 2px center;
		background-repeat: no-repeat;
		background-clip: border-box;
		border-right: solid 2px transparent;
		cursor: ew-resize;
		height: 100%;
		left: -0.75rem;
		min-width: 0;
		position: absolute;
		width: 0.75rem;
		z-index: 1;
	}

	.resize-handle:active,
	.resize-handle:hover {
		border-color: var(--focus-color);
	}
</style>
