<script lang="ts">
	import type { Snippet } from 'svelte';
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
		isMeasureContainer
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

	let sections = $derived(hasSection(container, relatedContainers));
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
							<AddSectionMenu bind:relatedContainers parentContainer={container} position={0} />
						</div>
					</div>
				{/if}

				{#each sections as sectionContainer, i (sectionContainer.guid)}
					<div class="section-wrapper">
						<Section bind:relatedContainers bind:container={sections[i]} />

						{#if $applicationState.containerDetailView.editable}
							<div class="add-section-wrapper">
								<AddSectionMenu bind:relatedContainers parentContainer={container} position={i} />
							</div>
						{/if}
					</div>
				{/each}
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
