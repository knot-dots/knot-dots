<script lang="ts">
	import { resource } from 'runed';
	import { page } from '$app/state';
	import fetchRelatedContainers from '$lib/client/fetchRelatedContainers';
	import AutoresizingTextarea from '$lib/components/AutoresizingTextarea.svelte';
	import Badges from '$lib/components/Badges.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import EditableLogo from '$lib/components/EditableLogo.svelte';
	import EditableProgress from '$lib/components/EditableProgress.svelte';
	import PropertiesBar from '$lib/components/PropertiesBar.svelte';
	import Sections from '$lib/components/Sections.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import {
		type AnyPayload,
		type Container,
		isContainer,
		isContainerWithBody,
		isContainerWithDescription,
		isContainerWithName,
		isContainerWithTitle,
		isSimpleMeasureContainer,
		payloadTypes,
		predicates
	} from '$lib/models';
	import { ability, applicationState } from '$lib/stores';

	interface Props {
		container: Container<AnyPayload>;
	}

	let { container = $bindable() }: Props = $props();

	let relatedContainersQuery = resource([() => container.guid], async ([guid], _, { signal }) =>
		fetchRelatedContainers(
			guid,
			{ relationType: [predicates.enum['is-part-of'], predicates.enum['is-section-of']] },
			'alpha',
			{
				signal
			}
		)
	);
</script>

<article class="details">
	<div class="details-scroll-wrapper">
		<header class="details-section">
			<div class="details-header">
				{#if container.payload.type === payloadTypes.enum.term}
					{#if $applicationState.containerDetailView.editable || container.payload.icon}
						<EditableLogo
							editable={$applicationState.containerDetailView.editable &&
								$ability.can('update', container)}
							allowedFileTypes={['image/svg+xml']}
							bind:value={container.payload.icon}
						/>
					{/if}
				{/if}
				<h1 class="details-title">
					{#if isContainerWithName(container)}
						{#if $applicationState.containerDetailView.editable && $ability.can('update', container)}
							<AutoresizingTextarea bind:value={container.payload.name} />
						{:else}
							{container.payload.name?.replace(
								/@current_organizational_unit_name/g,
								page.data.currentOrganizationalUnit?.payload.name ?? ''
							)}
						{/if}
					{:else if isContainerWithTitle(container)}
						{#if $applicationState.containerDetailView.editable && $ability.can('update', container)}
							<AutoresizingTextarea bind:value={container.payload.title} />
						{:else}
							{container.payload.title?.replace(
								/@current_organizational_unit_name/g,
								page.data.currentOrganizationalUnit?.payload.name ?? ''
							)}
						{/if}
					{/if}
				</h1>
			</div>

			{#if isContainer(container)}
				{#if createFeatureDecisions(page.data.features).useNewPropertyPanel()}
					<PropertiesBar
						bind:container
						editable={$applicationState.containerDetailView.editable &&
							$ability.can('update', container)}
						revisions={[]}
					/>
				{:else}
					<Badges
						bind:container
						editable={$applicationState.containerDetailView.editable &&
							$ability.can('update', container)}
					/>
				{/if}
			{/if}

			{#if isSimpleMeasureContainer(container)}
				<EditableProgress
					editable={$applicationState.containerDetailView.editable &&
						$ability.can('update', container)}
					bind:value={container.payload.progress}
				/>
			{/if}
		</header>

		{#if isContainerWithBody(container)}
			<EditableFormattedText
				bind:value={container.payload.body}
				editable={$applicationState.containerDetailView.editable &&
					$ability.can('update', container)}
			/>
		{:else if isContainerWithDescription(container)}
			<EditableFormattedText
				bind:value={container.payload.description}
				editable={$applicationState.containerDetailView.editable &&
					$ability.can('update', container)}
			/>
		{/if}

		<Sections {container} relatedContainers={relatedContainersQuery.current ?? []} />
	</div>
</article>

<style>
	.details-header {
		align-items: center;
		display: flex;
		gap: 0.75rem;
		margin-bottom: 0.375rem;
	}

	.details-header :global(.logo),
	.details-header :global(.logo-upload) {
		--logo-height: 2.5rem;
		flex-shrink: 0;
	}

	.details-title {
		flex-grow: 1;
		margin: 0;
		min-height: 3rem;
	}
</style>
