<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import autoSave from '$lib/client/autoSave';
	import requestSubmit from '$lib/client/requestSubmit';
	import Badges from '$lib/components/Badges.svelte';
	import EditableLogo from '$lib/components/EditableLogo.svelte';
	import EditableProgress from '$lib/components/EditableProgress.svelte';
	import Help from '$lib/components/Help.svelte';
	import {
		helpSlugForDetailView,
		payloadTypes,
		type Container,
		isSimpleMeasureContainer
	} from '$lib/models';
	import { applicationState, ability } from '$lib/stores';

	interface Props {
		container: Container;
		data?: Snippet;
	}

	let { container = $bindable(), data }: Props = $props();

	let w = $state(0);

	const handleSubmit = $derived(autoSave(container, 2000));
	const detailViewHelpSlug = $derived(helpSlugForDetailView(container.payload.type));
</script>

<form class="content-details" oninput={requestSubmit} onsubmit={handleSubmit} novalidate>
	<article class="details" bind:clientWidth={w} style={w ? `--content-width: ${w}px;` : undefined}>
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
				{#if $applicationState.containerDetailView.editable}
					<h1
						class="details-title"
						contenteditable="plaintext-only"
						bind:textContent={container.payload.title}
						onkeydown={(e) => (e.key === 'Enter' ? e.preventDefault() : null)}
					></h1>
				{:else}
					<h1 class="details-title" contenteditable="false">
						{container.payload.title.replace(
							/@current_organizational_unit_name/g,
							page.data.currentOrganizationalUnit?.payload.name ?? ''
						)}
					</h1>
				{/if}
			</div>

			<Badges
				bind:container
				editable={$applicationState.containerDetailView.editable &&
					$ability.can('update', container)}
			/>

			{#if isSimpleMeasureContainer(container)}
				<EditableProgress
					editable={$applicationState.containerDetailView.editable &&
						$ability.can('update', container)}
					bind:value={container.payload.progress}
				/>
			{/if}
		</header>

		{@render data?.()}
	</article>
</form>

{#if detailViewHelpSlug}
	<Help slug={detailViewHelpSlug} />
{/if}

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
