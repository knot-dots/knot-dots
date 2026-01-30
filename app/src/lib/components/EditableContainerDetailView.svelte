<script lang="ts">
	import type { Snippet } from 'svelte';
	import autoSave from '$lib/client/autoSave';
	import requestSubmit from '$lib/client/requestSubmit';
	import Badges from '$lib/components/Badges.svelte';
	import EditableProgress from '$lib/components/EditableProgress.svelte';
	import Help from '$lib/components/Help.svelte';
	import { type Container, isSimpleMeasureContainer } from '$lib/models';
	import { applicationState, ability } from '$lib/stores';

	interface Props {
		container: Container;
		data?: Snippet;
	}

	let { container = $bindable(), data }: Props = $props();

	let w = $state(0);

	const handleSubmit = autoSave(container, 2000);
</script>

<form class="content-details" oninput={requestSubmit} onsubmit={handleSubmit} novalidate>
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

<Help slug={`${container.payload.type.replace('_', '-')}-view`} />
