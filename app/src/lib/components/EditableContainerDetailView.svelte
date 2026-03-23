<script lang="ts">
	import type { Snippet } from 'svelte';
	import { createScrollAnchor } from '$lib/attachments/scrollAnchor.svelte';
	import autoSave from '$lib/client/autoSave';
	import requestSubmit from '$lib/client/requestSubmit';
	import Badges from '$lib/components/Badges.svelte';
	import EditableLogo from '$lib/components/EditableLogo.svelte';
	import EditableProgress from '$lib/components/EditableProgress.svelte';
	import Help from '$lib/components/Help.svelte';
	import { payloadTypes, type Container, isSimpleMeasureContainer } from '$lib/models';
	import { applicationState, ability } from '$lib/stores';

	interface Props {
		container: Container;
		data?: Snippet;
	}

	let { container = $bindable(), data }: Props = $props();

	let w = $state(0);

	const handleSubmit = $derived(autoSave(container, 2000));

	const {
		attachment: scrollAnchorAttachment,
		captureForEnter,
		captureForLeave,
		onEditableChange
	} = createScrollAnchor();

	let previousEditable: boolean | undefined = $applicationState.containerDetailView.editable;

	// Capture scroll position BEFORE DOM update when entering edit mode.
	$effect.pre(() => {
		const current = $applicationState.containerDetailView.editable;
		if (current === true && previousEditable !== true) {
			captureForEnter();
		} else if (current === false && previousEditable === true) {
			captureForLeave();
		}
	});

	// Notify after DOM update so scroll can be corrected.
	$effect(() => {
		const current = $applicationState.containerDetailView.editable;
		if (current !== previousEditable) {
			const prev = previousEditable;
			previousEditable = current;
			onEditableChange(prev, current);
		}
	});
</script>

<form
	class="content-details"
	{@attach scrollAnchorAttachment}
	oninput={requestSubmit}
	onsubmit={handleSubmit}
	novalidate
>
	<article class="details" bind:clientWidth={w} style={w ? `--content-width: ${w}px;` : undefined}>
		<header class="details-section" data-guid={container.guid}>
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
						{container.payload.title}
					</h1>
				{/if}
			</div>

			<div class="details-meta">
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
			</div>
		</header>

		{@render data?.()}
	</article>
</form>

<Help slug={`${container.payload.type.replace('_', '-')}-view`} />

<style>
	.details-header {
		align-items: center;
		display: flex;
		gap: 0.75rem;
	}

	.details-header :global(.logo),
	.details-header :global(.logo-upload) {
		--logo-height: 2.5rem;
		flex-shrink: 0;
	}

	.details-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-top: 0.5rem;
	}

	.details-title {
		flex-grow: 1;
		margin: 0;
		min-height: 3rem;
	}
</style>
