<script lang="ts">
	import { getContext } from 'svelte';
	import { type DndEvent, dndzone, TRIGGERS } from 'svelte-dnd-action';
	import { _ } from 'svelte-i18n';
	import Minus from '~icons/heroicons/minus-solid';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import saveContainer from '$lib/client/saveContainer';
	import Card from '$lib/components/Card.svelte';
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import { type Container, type Predicate, predicates, type Relation } from '$lib/models';
	import { dragged, overlayHistory } from '$lib/stores';
	import { predicateIcons } from '$lib/theme/models';

	export let object: Container;
	export let relatedContainers: Container[];

	let workspaceOptions = getContext<Array<{ label: string; value: string }>>('workspaceOptions');

	let enabledPredicates = (getContext('relationOverlay') as { predicates: Predicate[] }).predicates;

	type DropZone = {
		active: boolean;
		help: string;
		items: { guid: string; container: Container }[];
		predicate: Predicate;
		createRelation: (selected: Container, dragged: Container) => Relation;
	};

	function createRelation(subject: Container, predicate: Predicate, object: Container): Relation {
		return {
			object: object.guid,
			position: 0,
			predicate: predicate,
			subject: subject.guid
		};
	}

	let dropZones: DropZone[] = [];

	$: dropZones = [
		{
			active: false,
			items: relatedContainers
				.filter(({ guid }) => guid != object.guid)
				.filter(
					({ relation }) =>
						relation.findIndex(
							(r) =>
								(r.object == object.guid || r.subject == object.guid) &&
								r.predicate == predicates.enum['is-consistent-with']
						) > -1
				)
				.map((container) => ({ guid: container.guid, container })),
			help: $_('relation_overlay.is_consistent_with'),
			predicate: predicates.enum['is-consistent-with'],
			createRelation: function (selected: Container, dragged: Container) {
				return createRelation(dragged, this.predicate, selected);
			}
		},
		{
			active: false,
			items: relatedContainers
				.filter(({ guid }) => guid != object.guid)
				.filter(
					({ relation }) =>
						relation.findIndex(
							(r) =>
								(r.object == object.guid || r.subject == object.guid) &&
								r.predicate == predicates.enum['is-inconsistent-with']
						) > -1
				)
				.map((container) => ({ guid: container.guid, container })),
			help: $_('relation_overlay.is_inconsistent_with'),
			predicate: predicates.enum['is-inconsistent-with'],
			createRelation: function (selected: Container, dragged: Container) {
				return createRelation(dragged, this.predicate, selected);
			}
		},
		{
			active: false,
			items: relatedContainers
				.filter(({ guid }) => guid != object.guid)
				.filter(
					({ relation }) =>
						relation.findIndex(
							(r) =>
								(r.object == object.guid || r.subject == object.guid) &&
								r.predicate == predicates.enum['is-equivalent-to']
						) > -1
				)
				.map((container) => ({ guid: container.guid, container })),
			help: $_('relation_overlay.is_equivalent_to'),
			predicate: predicates.enum['is-equivalent-to'],
			createRelation: function (selected: Container, dragged: Container) {
				return createRelation(dragged, this.predicate, selected);
			}
		},
		{
			active: false,
			items: relatedContainers
				.filter(({ guid }) => guid != object.guid)
				.filter(
					({ relation }) =>
						relation.findIndex(
							(r) =>
								r.subject == object.guid && r.predicate == predicates.enum['is-superordinate-of']
						) > -1
				)
				.map((container) => ({ guid: container.guid, container })),
			help: $_('relation_overlay.selected_is_superordinate_of_dragged', {
				values: { selected: object.payload.title }
			}),
			predicate: predicates.enum['is-superordinate-of'],
			createRelation: function (selected: Container, dragged: Container) {
				return createRelation(selected, this.predicate, dragged);
			}
		},
		{
			active: false,
			items: relatedContainers
				.filter(({ guid }) => guid != object.guid)
				.filter(
					({ relation }) =>
						relation.findIndex(
							(r) =>
								r.object == object.guid && r.predicate == predicates.enum['is-superordinate-of']
						) > -1
				)
				.map((container) => ({ guid: container.guid, container })),
			help: $_('relation_overlay.dragged_is_superordinate_of_selected', {
				values: { selected: object.payload.title }
			}),
			predicate: predicates.enum['is-superordinate-of'],
			createRelation: function (selected: Container, dragged: Container) {
				return createRelation(dragged, this.predicate, selected);
			}
		},
		{
			active: false,
			items: relatedContainers
				.filter(({ guid }) => guid != object.guid)
				.filter(
					({ relation }) =>
						relation.findIndex(
							(r) =>
								r.subject == object.guid && r.predicate == predicates.enum['is-prerequisite-for']
						) > -1
				)
				.map((container) => ({ guid: container.guid, container })),
			help: $_('relation_overlay.selected_is_prerequisite_for_dragged', {
				values: { selected: object.payload.title }
			}),
			predicate: predicates.enum['is-prerequisite-for'],
			createRelation: function (selected: Container, dragged: Container) {
				return createRelation(selected, this.predicate, dragged);
			}
		},
		{
			active: false,
			items: relatedContainers
				.filter(({ guid }) => guid != object.guid)
				.filter(
					({ relation }) =>
						relation.findIndex(
							(r) =>
								r.object == object.guid && r.predicate == predicates.enum['is-prerequisite-for']
						) > -1
				)
				.map((container) => ({ guid: container.guid, container })),
			help: $_('relation_overlay.dragged_is_prerequisite_for_selected', {
				values: { selected: object.payload.title }
			}),
			predicate: predicates.enum['is-prerequisite-for'],
			createRelation: function (selected: Container, dragged: Container) {
				return createRelation(dragged, this.predicate, selected);
			}
		},
		{
			active: false,
			items: relatedContainers
				.filter(({ guid }) => guid != object.guid)
				.filter(
					({ relation }) =>
						relation.findIndex(
							(r) => r.subject == object.guid && r.predicate == predicates.enum['contributes-to']
						) > -1
				)
				.map((container) => ({ guid: container.guid, container })),
			help: $_('relation_overlay.selected_contributes_to_dragged', {
				values: { selected: object.payload.title }
			}),
			predicate: predicates.enum['contributes-to'],
			createRelation: function (selected: Container, dragged: Container) {
				return createRelation(selected, this.predicate, dragged);
			}
		},
		{
			active: false,
			items: relatedContainers
				.filter(({ guid }) => guid != object.guid)
				.filter(
					({ relation }) =>
						relation.findIndex(
							(r) => r.object == object.guid && r.predicate == predicates.enum['contributes-to']
						) > -1
				)
				.map((container) => ({ guid: container.guid, container })),
			help: $_('relation_overlay.dragged_contributes_to_selected', {
				values: { selected: object.payload.title }
			}),
			predicate: predicates.enum['contributes-to'],
			createRelation: function (selected: Container, dragged: Container) {
				return createRelation(dragged, this.predicate, selected);
			}
		},
		{
			active: false,
			items: relatedContainers
				.filter(({ guid }) => guid != object.guid)
				.filter(
					({ relation }) =>
						relation.findIndex(
							(r) => r.subject == object.guid && r.predicate == predicates.enum['is-sub-target-of']
						) > -1
				)
				.map((container) => ({ guid: container.guid, container })),
			help: $_('relation_overlay.selected_is_sub_target_of_dragged', {
				values: { selected: object.payload.title }
			}),
			predicate: predicates.enum['is-sub-target-of'],
			createRelation: function (selected: Container, dragged: Container) {
				return createRelation(selected, this.predicate, dragged);
			}
		},
		{
			active: false,
			items: relatedContainers
				.filter(({ guid }) => guid != object.guid)
				.filter(
					({ relation }) =>
						relation.findIndex(
							(r) => r.object == object.guid && r.predicate == predicates.enum['is-sub-target-of']
						) > -1
				)
				.map((container) => ({ guid: container.guid, container })),
			help: $_('relation_overlay.dragged_is_sub_target_of_selected', {
				values: { selected: object.payload.title }
			}),
			predicate: predicates.enum['is-sub-target-of'],
			createRelation: function (selected: Container, dragged: Container) {
				return createRelation(dragged, this.predicate, selected);
			}
		},
		{
			active: false,
			items: relatedContainers
				.filter(({ guid }) => guid != object.guid)
				.filter(
					({ relation }) =>
						relation.findIndex(
							(r) =>
								r.subject == object.guid && r.predicate == predicates.enum['is-concrete-target-of']
						) > -1
				)
				.map((container) => ({ guid: container.guid, container })),
			help: $_('relation_overlay.selected_is_concrete_target_of_dragged', {
				values: { selected: object.payload.title }
			}),
			predicate: predicates.enum['is-concrete-target-of'],
			createRelation: function (selected: Container, dragged: Container) {
				return createRelation(selected, this.predicate, dragged);
			}
		},
		{
			active: false,
			items: relatedContainers
				.filter(({ guid }) => guid != object.guid)
				.filter(
					({ relation }) =>
						relation.findIndex(
							(r) =>
								r.object == object.guid && r.predicate == predicates.enum['is-concrete-target-of']
						) > -1
				)
				.map((container) => ({ guid: container.guid, container })),
			help: $_('relation_overlay.dragged_is_concrete_target_of_selected', {
				values: { selected: object.payload.title }
			}),
			predicate: predicates.enum['is-concrete-target-of'],
			createRelation: function (selected: Container, dragged: Container) {
				return createRelation(dragged, this.predicate, selected);
			}
		},
		{
			active: false,
			items: relatedContainers
				.filter(({ guid }) => guid != object.guid)
				.filter(
					({ relation }) =>
						relation.findIndex(
							(r) => r.subject == object.guid && r.predicate == predicates.enum['is-affected-by']
						) > -1
				)
				.map((container) => ({ guid: container.guid, container })),
			help: $_('relation_overlay.selected_is_affected_by_dragged', {
				values: { selected: object.payload.title }
			}),
			predicate: predicates.enum['is-affected-by'],
			createRelation: function (selected: Container, dragged: Container) {
				return createRelation(selected, this.predicate, dragged);
			}
		},
		{
			active: false,
			items: relatedContainers
				.filter(({ guid }) => guid != object.guid)
				.filter(
					({ relation }) =>
						relation.findIndex(
							(r) => r.object == object.guid && r.predicate == predicates.enum['is-affected-by']
						) > -1
				)
				.map((container) => ({ guid: container.guid, container })),
			help: $_('relation_overlay.dragged_is_affected_by_selected', {
				values: { selected: object.payload.title }
			}),
			predicate: predicates.enum['is-affected-by'],
			createRelation: function (selected: Container, dragged: Container) {
				return createRelation(dragged, this.predicate, selected);
			}
		},
		{
			active: false,
			items: relatedContainers
				.filter(({ guid }) => guid != object.guid)
				.filter(
					({ relation }) =>
						relation.findIndex(
							(r) => r.subject == object.guid && r.predicate == predicates.enum['is-subtask-of']
						) > -1
				)
				.map((container) => ({ guid: container.guid, container })),
			help: $_('relation_overlay.selected_is_subtask_of_dragged', {
				values: { selected: object.payload.title }
			}),
			predicate: predicates.enum['is-subtask-of'],
			createRelation: function (selected: Container, dragged: Container) {
				return createRelation(selected, this.predicate, dragged);
			}
		},
		{
			active: false,
			items: relatedContainers
				.filter(({ guid }) => guid != object.guid)
				.filter(
					({ relation }) =>
						relation.findIndex(
							(r) => r.object == object.guid && r.predicate == predicates.enum['is-subtask-of']
						) > -1
				)
				.map((container) => ({ guid: container.guid, container })),
			help: $_('relation_overlay.dragged_is_subtask_of_selected', {
				values: { selected: object.payload.title }
			}),
			predicate: predicates.enum['is-subtask-of'],
			createRelation: function (selected: Container, dragged: Container) {
				return createRelation(dragged, this.predicate, selected);
			}
		}
	].filter(({ predicate }) => enabledPredicates.includes(predicate));

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

	async function handleDndFinalize(
		index: number,
		event: CustomEvent<DndEvent<{ guid: string; container: Container }>>
	) {
		if (event.detail.info.trigger === TRIGGERS.DROPPED_INTO_ZONE && $dragged) {
			$dragged.relation.push(dropZones[index].createRelation(object, $dragged));
			dropZones[index].active = true;
			setTimeout(() => {
				dropZones[index].active = false;
				activeDropZoneIndex = -1;
			}, 2000);
			await saveContainer({ ...$dragged, guid: $dragged.guid.split('_')[0] });
			await invalidateAll();
		}
	}

	async function removeRelation(subject: Container, predicate: Predicate, object: Container) {
		object.relation = object.relation.filter(
			(r) => r.object != object.guid || r.predicate != predicate || r.subject != subject.guid
		);
		subject.relation = subject.relation.filter(
			(r) => r.object != object.guid || r.predicate != predicate || r.subject != subject.guid
		);

		await saveContainer(subject);
		await invalidateAll();
	}
</script>

<Header {workspaceOptions} />
<div class="content-details masked-overflow">
	<div class="details details-editable">
		<p>
			{$_('relation_overlay.help', {
				values: {
					type: $_(object.payload.type),
					nameOrTitle: object.payload.title
				}
			})}
		</p>

		{#each dropZones as zone, i (i)}
			<div class="drop-zone-wrapper">
				<p>
					<svelte:component this={predicateIcons.get(zone.predicate)} />
					{zone.help}
				</p>
				<ul
					class="carousel drop-zone drop-zone--{zone.predicate}"
					class:drop-zone--is-active={i === activeDropZoneIndex}
					class:drop-zone--has-received={zone.active}
					use:dndzone={{
						dragDisabled: true,
						dropTargetStyle: {},
						items: zone.items,
						morphDisabled: true
					}}
					on:consider={(e) => handleDndConsider(i, e)}
					on:finalize={(e) => handleDndFinalize(i, e)}
				>
					{#each zone.items as item (item.guid)}
						<li>
							<Card container={item.container}>
								{#snippet button()}
									{#if object.relation.find((r) => zone.predicate === r.predicate && item.container.guid === r.object && object.guid === r.subject)}
										<button
											class="button-square"
											type="button"
											on:click|stopPropagation={() =>
												removeRelation(object, zone.predicate, item.container)}
										>
											<Minus />
										</button>
									{:else}
										<button
											class="button-square"
											type="button"
											on:click|stopPropagation={() =>
												removeRelation(item.container, zone.predicate, object)}
										>
											<Minus />
										</button>
									{/if}
								{/snippet}
							</Card>
						</li>
					{/each}
				</ul>
			</div>
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

<Help slug="relations" />

<style>
	.drop-zone-wrapper {
		color: var(--color-gray-500);
		stroke: var(--color-gray-500);
	}

	.drop-zone-wrapper > p {
		align-items: center;
		display: flex;
		gap: 0.5rem;
	}

	.drop-zone {
		background-color: var(--color-gray-050);
		border-radius: 8px;
		min-height: 10rem;
		padding: 1rem;
	}

	.drop-zone.drop-zone--is-active {
		outline-style: dashed;
		outline-width: 3px;
	}
</style>
