<script lang="ts">
	import type { Snippet } from 'svelte';
	import { flip } from 'svelte/animate';
	import { type DndEvent, dragHandleZone } from 'svelte-dnd-action';
	import autoSave from '$lib/client/autoSave';
	import requestSubmit from '$lib/client/requestSubmit';
	import saveContainer from '$lib/client/saveContainer';
	import AddSectionMenu from '$lib/components/AddSectionMenu.svelte';
	import Badges from '$lib/components/Badges.svelte';
	import EditableProgress from '$lib/components/EditableProgress.svelte';
	import Section from '$lib/components/Section.svelte';
	import {
		type AnyContainer,
		container as containerSchema,
		type Container,
		containerOfType,
		isContainerWithProgress,
		isContainerWithTitle,
		isGoalContainer,
		isMeasureContainer,
		isSimpleMeasureContainer,
		type NewContainer,
		payloadTypes,
		predicates
	} from '$lib/models';
	import { hasSection } from '$lib/relations';
	import { applicationState } from '$lib/stores';

	interface Props {
		container: Container;
		data?: Snippet;
		relatedContainers: Container[];
		revisions: AnyContainer[];
	}

	let {
		container = $bindable(),
		data,
		relatedContainers: originalRelatedContainers,
		revisions
	}: Props = $props();

	let w = $state(0);

	const handleSubmit = autoSave(container, 2000);

	let relatedContainers = $state(originalRelatedContainers);

	let sections = $derived(
		hasSection(container, relatedContainers).toSorted(
			(a, b) =>
				container.relation.findIndex(({ subject }) => subject === a.guid) -
				container.relation.findIndex(({ subject }) => subject === b.guid)
		)
	);

	function createAddSectionHandler(position: number) {
		return async (event: Event) => {
			const payloadType = payloadTypes.safeParse((event as CustomEvent).detail.selected).data;

			if (!payloadType) {
				return;
			}

			const newContainer = containerOfType(
				payloadType,
				container.organization,
				container.organizational_unit,
				container.managed_by,
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

			const response = await saveContainer(newContainer);
			const result = containerSchema.safeParse(await response.json());
			if (!result.success) {
				return;
			}

			relatedContainers = [...relatedContainers, result.data];
			sections = [...sections.slice(0, position), result.data, ...sections.slice(position)];
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
		};
	}

	function handleDndConsider(event: CustomEvent<DndEvent<Container>>) {
		sections = event.detail.items;
	}

	async function handleDndFinalize(event: CustomEvent<DndEvent<Container>>) {
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

<form oninput={requestSubmit} onsubmit={handleSubmit} novalidate>
	<article class="details" bind:clientWidth={w} style={w ? `--content-width: ${w}px;` : undefined}>
		<header class="details-section">
			{#if $applicationState.containerDetailView.editable}
				<h1
					class="details-title"
					contenteditable="plaintext-only"
					bind:textContent={container.payload.title}
					onkeydown={(e) => (e.key === 'Enter' ? e.preventDefault() : null)}
				></h1>
			{:else}
				<h1 class="details-title" contenteditable="false">
					{container.payload.title}
				</h1>
			{/if}

			<Badges bind:container editable={$applicationState.containerDetailView.editable} />

			{#if isContainerWithProgress(container)}
				<EditableProgress
					editable={$applicationState.containerDetailView.editable}
					bind:value={container.payload.progress}
				/>
			{/if}
		</header>

		{@render data?.()}

		{#if isGoalContainer(container) || isMeasureContainer(container) || isSimpleMeasureContainer(container)}
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
		{/if}
	</article>
</form>

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
