<script lang="ts">
	import { resource } from 'runed';
	import { page } from '$app/state';
	import autoSave from '$lib/client/autoSave';
	import requestSubmit from '$lib/client/requestSubmit';
	import AutoresizingTextarea from '$lib/components/AutoresizingTextarea.svelte';
	import Badges from '$lib/components/Badges.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import EditableLogo from '$lib/components/EditableLogo.svelte';
	import EditableProgress from '$lib/components/EditableProgress.svelte';
	import Sections from '$lib/components/Sections.svelte';
	import {
		type AnyPayload,
		type Container,
		isContainer,
		isContainerWithBody,
		isContainerWithDescription,
		isContainerWithName,
		isContainerWithTitle,
		isSimpleMeasureContainer,
		payloadTypes
	} from '$lib/models';
	import { ability, applicationState } from '$lib/stores';
	import fetchRelatedContainers from '$lib/client/fetchRelatedContainers';

	interface Props {
		container: Container<AnyPayload>;
	}

	let { container = $bindable() }: Props = $props();

	let relatedContainersQuery = resource([() => container.guid], async ([guid], _, { signal }) =>
		fetchRelatedContainers(guid, {}, 'alpha', { signal })
	);

	const handleSubmit = $derived(autoSave(container, 2000));
</script>

<article class="details">
	<form oninput={requestSubmit} onsubmit={handleSubmit} novalidate>
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
				<Badges
					bind:container
					editable={$applicationState.containerDetailView.editable &&
						$ability.can('update', container)}
				/>
			{/if}

			{#if isSimpleMeasureContainer(container)}
				<EditableProgress
					editable={$applicationState.containerDetailView.editable &&
						$ability.can('update', container)}
					bind:value={container.payload.progress}
				/>
			{/if}
		</header>
	</form>

	{#if isContainerWithBody(container)}
		<EditableFormattedText
			bind:value={container.payload.body}
			editable={$applicationState.containerDetailView.editable && $ability.can('update', container)}
		/>
	{:else if isContainerWithDescription(container)}
		<EditableFormattedText
			bind:value={container.payload.description}
			editable={$applicationState.containerDetailView.editable && $ability.can('update', container)}
		/>
	{/if}

	<Sections {container} relatedContainers={relatedContainersQuery.current ?? []} />
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
