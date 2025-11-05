<script lang="ts">
	import { flip } from 'svelte/animate';
	import { _ } from 'svelte-i18n';
	import { type DndEvent, dragHandleZone } from 'svelte-dnd-action';
	import saveContainer from '$lib/client/saveContainer';
	import AddSectionMenu from '$lib/components/AddSectionMenu.svelte';
	import Section from '$lib/components/Section.svelte';
	import {
		type AnyContainer,
		container as containerSchema,
		containerOfType,
		isContainerWithTitle,
		isOrganizationalUnitContainer,
		type NewContainer,
		payloadTypes,
		predicates
	} from '$lib/models';
	import { applicationState } from '$lib/stores';

	interface Props {
		container: AnyContainer;
		relatedContainers: AnyContainer[];
	}

	let { container = $bindable(), relatedContainers }: Props = $props();

	let guid = $derived(container.guid);

	let sections = $state([]) as AnyContainer[];

	$effect(() => {
		sections = relatedContainers
			.filter((c) => c.guid != guid)
			.filter(({ relation }) =>
				relation.some(
					({ object, predicate }) => object == guid && predicate == predicates.enum['is-section-of']
				)
			)
			.toSorted(
				(a, b) =>
					a.relation.find(({ predicate }) => predicate == predicates.enum['is-section-of'])!
						.position -
					b.relation.find(({ predicate }) => predicate == predicates.enum['is-section-of'])!
						.position
			);
	});

	function createAddSectionHandler(position: number) {
		return async (event: Event) => {
			const payloadType = payloadTypes.safeParse((event as CustomEvent).detail.selected).data;

			if (!payloadType) {
				return;
			}

			const newContainer = containerOfType(
				payloadType,
				container.organization,
				isOrganizationalUnitContainer(container) ? container.guid : container.organizational_unit,
				isOrganizationalUnitContainer(container) ? container.guid : container.managed_by,
				container.realm
			) as NewContainer;

			newContainer.relation = [
				{
					object: container.guid,
					position: position,
					predicate: predicates.enum['is-section-of']
				}
			];

			if (isContainerWithTitle(newContainer) && !newContainer.payload.title) {
				newContainer.payload.title = '';
			}

			if (payloadType === payloadTypes.enum.task_collection && isContainerWithTitle(newContainer)) {
				newContainer.payload.title = container.payload.type === payloadTypes.enum.task ? $_('subtasks') : $_('tasks');
			}

			const response = await saveContainer(newContainer);
			const result = containerSchema.safeParse(await response.json());
			if (!result.success) {
				return;
			}

			sections = [
				...sections.slice(0, position),
				result.data,
				...sections.slice(position).map((s, i) => ({
					...s,
					relation: [
						{
							object: container.guid,
							position: position + i + 1,
							predicate: predicates.enum['is-section-of'],
							subject: s.guid
						},
						...s.relation.filter(({ predicate }) => predicate !== predicates.enum['is-section-of'])
					]
				}))
			];
			container.relation = [
				...sections.map(({ guid }, index) => ({
					object: container.guid,
					position: index,
					predicate: predicates.enum['is-section-of'],
					subject: guid
				})),
				...container.relation.filter(
					({ predicate }) => predicate !== predicates.enum['is-section-of']
				)
			];
			relatedContainers = [
				...relatedContainers.filter(({ guid }) => !sections.map(({ guid }) => guid).includes(guid)),
				...sections
			];

			const url = `/container/${container.guid}/relation`;
			await fetch(url, {
				method: 'POST',
				body: JSON.stringify(container.relation),
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json'
				}
			});
		};
	}

	function handleDndConsider(event: CustomEvent<DndEvent<AnyContainer>>) {
		sections = event.detail.items;
	}

	async function handleDndFinalize(event: CustomEvent<DndEvent<AnyContainer>>) {
		sections = event.detail.items;
		container.relation = [
			...sections.map(({ guid }, index) => ({
				object: container.guid,
				position: index,
				predicate: predicates.enum['is-section-of'],
				subject: guid
			})),
			...container.relation.filter(
				({ predicate }) => predicate !== predicates.enum['is-section-of']
			)
		];

		const url = `/container/${container.guid}/relation`;
		await fetch(url, {
			method: 'POST',
			body: JSON.stringify(container.relation),
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json'
			}
		});
	}
</script>

<div class="sections">
	{#if $applicationState.containerDetailView.editable}
		<div class="section-wrapper">
			<div class="add-section-wrapper">
				<AddSectionMenu
					bind:relatedContainers
					bind:parentContainer={container}
					handleAddSection={createAddSectionHandler(0)}
				/>
			</div>
		</div>
	{/if}

	<ul
		use:dragHandleZone={{ dropTargetStyle: {}, items: sections, flipDurationMs: 100 }}
		onconsider={handleDndConsider}
		onfinalize={handleDndFinalize}
	>
		{#each sections as { guid }, i (guid)}
			<li animate:flip={{ duration: 100 }} class="section-wrapper">
				<Section bind:relatedContainers bind:container={sections[i]} />

				{#if $applicationState.containerDetailView.editable}
					<div class="add-section-wrapper">
						<AddSectionMenu
							bind:relatedContainers
							bind:parentContainer={container}
							handleAddSection={createAddSectionHandler(i + 1)}
						/>
					</div>
				{/if}
			</li>
		{/each}
	</ul>
</div>

<style>
	.section-wrapper {
		position: relative;
	}

	.add-section-wrapper {
		bottom: -1.25rem;
		position: absolute;
		width: 100%;
		z-index: 1;
	}

	.add-section-wrapper::before {
		background-color: var(--color-primary-200);
		border: 12px solid white;
		border-radius: calc(infinity * 1px);
		content: '';
		display: block;
		height: 27px;
		left: 0.75rem;
		position: absolute;
		right: 0.75rem;
		top: calc(50% - 13px);
	}

	.add-section-wrapper:hover::before {
		background-color: var(--color-primary-700);
		border-color: var(--color-primary-050);
	}

	.add-section-wrapper:has(:global(.dropdown-panel)) {
		z-index: 2;
	}
</style>
