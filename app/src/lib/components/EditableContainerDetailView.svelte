<script lang="ts">
	import type { Snippet } from 'svelte';
	import { flip } from 'svelte/animate';
	import { dragHandleZone } from 'svelte-dnd-action';
	import autoSave from '$lib/client/autoSave';
	import requestSubmit from '$lib/client/requestSubmit';
	import AddSectionMenu from '$lib/components/AddSectionMenu.svelte';
	import Badges from '$lib/components/Badges.svelte';
	import EditableProgress from '$lib/components/EditableProgress.svelte';
	import Section from '$lib/components/Section.svelte';
	import {
		type AnyContainer,
		type Container,
		isContainerWithProgress,
		isGoalContainer,
		isMeasureContainer,
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

	let { container = $bindable(), data, relatedContainers, revisions }: Props = $props();

	const handleSubmit = autoSave(container, 2000);

	let sections = $derived(
		hasSection(container, relatedContainers).toSorted(
			(a, b) =>
				container.relation.findIndex(({ subject }) => subject === a.guid) -
				container.relation.findIndex(({ subject }) => subject === b.guid)
		)
	);

	function handleDndConsider(event: CustomEvent<DndEvent<Container>>) {
		sections = event.detail.items;
	}

	async function handleDndFinalize(event: CustomEvent<DndEvent<Container>>) {
		sections = event.detail.items;
		const relation = [
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
			body: JSON.stringify(relation),
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json'
			}
		});
	}
</script>

<form oninput={requestSubmit} onsubmit={handleSubmit} novalidate>
	<article class="details details-editable">
		<div class="details-tab" id="basic-data">
			{#if $applicationState.containerDetailView.editable}
				<h2
					class="details-title"
					contenteditable="plaintext-only"
					bind:textContent={container.payload.title}
					onkeydown={(e) => (e.key === 'Enter' ? e.preventDefault() : null)}
				></h2>
			{:else}
				<h2 class="details-title" contenteditable="false">
					{container.payload.title}
				</h2>
			{/if}

			<Badges bind:container editable={$applicationState.containerDetailView.editable} />

			{#if isContainerWithProgress(container)}
				<EditableProgress
					editable={$applicationState.containerDetailView.editable}
					bind:value={container.payload.progress}
					compact
				/>
			{/if}
		</div>

		{@render data?.()}

		{#if isGoalContainer(container) || isMeasureContainer(container)}
			<div class="sections">
				{#if $applicationState.containerDetailView.editable}
					<div class="section-wrapper">
						<div class="add-section-wrapper">
							<AddSectionMenu
								bind:relatedContainers
								bind:parentContainer={container}
								position={0}
							/>
						</div>
					</div>
				{/if}

				<ul
					use:dragHandleZone={{ items: sections, flipDurationMs: 100 }}
					onconsider={handleDndConsider}
					onfinalize={handleDndFinalize}
				>
					{#each sections as sectionContainer, i (sectionContainer.guid)}
						<li animate:flip={{ duration: 100 }} class="section-wrapper">
							<Section bind:relatedContainers bind:container={sections[i]} />

							{#if $applicationState.containerDetailView.editable}
								<div class="add-section-wrapper">
									<AddSectionMenu
										bind:relatedContainers
										bind:parentContainer={container}
										position={i}
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
		bottom: -1.5rem;
		left: -3.25rem;
		position: absolute;
		width: calc(100% + 3.5rem);
		z-index: 1;
	}

	.add-section-wrapper::after {
		background-color: var(--color-primary-700);
		border-radius: calc(infinity * 1px);
		content: '';
		display: block;
		height: 3px;
		left: 3.25rem;
		position: absolute;
		right: 0;
		top: calc(50% - 1px);
	}

	@media (hover: hover) {
		.add-section-wrapper > :global(*),
		.add-section-wrapper::after {
			visibility: hidden;
		}

		.add-section-wrapper:has(:global(.dropdown-panel)) {
			z-index: 2;
		}

		.add-section-wrapper:hover > :global(*),
		.add-section-wrapper > :global(*:has(.dropdown-panel)),
		.add-section-wrapper:hover::after {
			visibility: visible;
		}
	}
</style>
