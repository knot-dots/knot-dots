<script lang="ts">
	import { page } from '$app/state';
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
		isChapterContainer,
		isContainerWithTitle,
		isResourceV2Container,
		isOrganizationalUnitContainer,
		type NewContainer,
		payloadTypes,
		predicates,
		isResourceDataPayload
	} from '$lib/models';
	import { applicationState, ability } from '$lib/stores';

	interface Props {
		container: AnyContainer;
		relatedContainers: AnyContainer[];
	}

	let { container = $bindable(), relatedContainers }: Props = $props();

	let guid = $derived(container.guid);

	let sections = $state([]) as AnyContainer[];

	const type = crypto.randomUUID();

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
					a.relation.find(
						({ object, predicate }) =>
							object == guid && predicate == predicates.enum['is-section-of']
					)!.position -
					b.relation.find(
						({ object, predicate }) =>
							object == guid && predicate == predicates.enum['is-section-of']
					)!.position
			);
	});

	function createAddSectionHandler(position: number) {
		return async (event: Event) => {
			const payloadType = payloadTypes.safeParse((event as CustomEvent).detail.selected).data;

			if (!payloadType) {
				return;
			}

			let organization = container.organization;
			let organizationalUnit = isOrganizationalUnitContainer(container)
				? container.guid
				: container.organizational_unit;
			let managedBy = isOrganizationalUnitContainer(container)
				? container.guid
				: container.managed_by;

			if (isResourceDataPayload(payloadType) && isResourceV2Container(container)) {
				const currentOrganization = page.data.currentOrganization;
				const currentOrganizationalUnit = page.data.currentOrganizationalUnit;

				if (currentOrganizationalUnit) {
					organization = currentOrganizationalUnit.organization;
					organizationalUnit = currentOrganizationalUnit.guid;
					managedBy = currentOrganizationalUnit.guid;
				} else if (currentOrganization) {
					organization = currentOrganization.guid;
					organizationalUnit = null;
					managedBy = currentOrganization.guid;
				}
			}

			const newContainer = containerOfType(
				payloadType,
				organization,
				organizationalUnit,
				managedBy,
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

			if (isChapterContainer(newContainer)) {
				newContainer.payload.number = String(
					parseInt(
						sections
							.slice(0, position)
							.filter(isChapterContainer)
							.at(-1)
							?.payload.number.split('.')
							.at(0) ?? '0'
					) + 1
				);
			}

			if (payloadType === payloadTypes.enum.task_collection && isContainerWithTitle(newContainer)) {
				newContainer.payload.title =
					container.payload.type === payloadTypes.enum.task ? $_('subtasks') : $_('tasks');
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

	function heading(position: number) {
		const chapter = sections.slice(0, position).reverse().find(isChapterContainer);
		const level = Math.min((chapter?.payload.number.split('.').length ?? 0) + 2, 6);
		return `h${level}` as 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
	}
</script>

<div class="sections">
	{#if $applicationState.containerDetailView.editable && $ability.can('update', container) && sections.length == 0}
		<div class="details-section">
			<AddSectionMenu
				bind:relatedContainers
				bind:parentContainer={container}
				handleAddSection={createAddSectionHandler(0)}
			/>
		</div>
	{/if}

	<ul
		use:dragHandleZone={{ dropTargetStyle: {}, flipDurationMs: 100, items: sections, type }}
		onconsider={handleDndConsider}
		onfinalize={handleDndFinalize}
	>
		{#each sections as { guid }, i (guid)}
			<li animate:flip={{ duration: 100 }}>
				<Section
					bind:container={sections[i]}
					bind:parentContainer={container}
					bind:relatedContainers
					handleAddSection={createAddSectionHandler(i + 1)}
					heading={heading(i)}
				/>
			</li>
		{/each}
	</ul>
</div>

<style>
	.sections :global(section h2.details-heading) {
		color: var(--color-gray-800);
		font-size: 1.875rem;
		font-weight: 600;
	}

	.sections :global(section h3.details-heading) {
		color: var(--color-gray-800);
		font-size: 1.875rem;
		font-weight: 400;
	}

	.sections :global(section h4.details-heading) {
		color: var(--color-gray-800);
		font-size: 1.5rem;
		font-weight: 600;
	}

	.details-section {
		--dropdown-button-active-border-color: transparent;
		--dropdown-button-border-width: 1px;
		--dropdown-button-default-background: transparent;
		--dropdown-button-default-border-color: transparent;
		--dropdown-button-expanded-background: var(--color-primary-050);
		--dropdown-button-expanded-border-color: var(--color-primary-200);
		--dropdown-button-expanded-color: var(--color-primary-700);
		--dropdown-button-hover-border-color: transparent;
		--dropdown-button-icon-expanded-color: inherit;
	}
</style>
