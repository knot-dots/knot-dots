<script lang="ts">
	import { _ } from 'svelte-i18n';
	import autoSave from '$lib/client/autoSave';
	import requestSubmit from '$lib/client/requestSubmit';
	import Card from '$lib/components/Card.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import EditableLogo from '$lib/components/EditableLogo.svelte';
	import OrganizationProperties from '$lib/components/OrganizationProperties.svelte';
	import {
		type Container,
		isContainerWithEffect,
		isContainerWithObjective,
		type OrganizationContainer
	} from '$lib/models';
	import { ability, applicationState } from '$lib/stores';

	interface Props {
		container: OrganizationContainer;
		containersRelatedToIndicators?: Container[];
		indicators?: Container[];
		measures?: Container[];
		programs?: Container[];
	}

	let {
		container = $bindable(),
		containersRelatedToIndicators = [],
		indicators = [],
		measures = [],
		programs = []
	}: Props = $props();

	const handleSubmit = autoSave(container, 2000);
</script>

<form oninput={requestSubmit} onsubmit={handleSubmit} novalidate>
	<article class="details details-editable">
		<header>
			<EditableLogo
				editable={$applicationState.containerDetailView.editable}
				bind:value={container.payload.image}
			/>
			{#if $applicationState.containerDetailView.editable}
				<h2
					class="details-title"
					contenteditable="plaintext-only"
					bind:textContent={container.payload.name}
					onkeydown={(e) => (e.key === 'Enter' ? e.preventDefault() : null)}
				></h2>
			{:else}
				<h2 class="details-title" contenteditable="false">
					{container.payload.name}
				</h2>
			{/if}
		</header>

		{#if $ability.can('update', container)}
			<OrganizationProperties
				bind:container
				editable={$applicationState.containerDetailView.editable &&
					$ability.can('update', container)}
			/>
		{/if}

		{#key container.guid}
			<EditableFormattedText
				editable={$applicationState.containerDetailView.editable &&
					$ability.can('update', container)}
				label={$_('description')}
				bind:value={container.payload.description}
			/>
		{/key}

		{#if container.payload.boards.includes('board.indicators')}
			<div class="details-tab" id="indicators">
				<h3>{$_('indicators')}</h3>
				<ul class="carousel">
					{#each indicators as indicator}
						{@const relatedContainers = [
							...containersRelatedToIndicators.filter(({ relation }) =>
								relation.some(({ object }) => object === indicator.guid)
							),
							...containersRelatedToIndicators.filter(isContainerWithEffect),
							...containersRelatedToIndicators.filter(isContainerWithObjective)
						]}
						<li>
							<Card container={indicator} {relatedContainers} />
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		<div class="details-tab" id="programs">
			<h3>{$_('programs')}</h3>
			<ul class="carousel">
				{#each programs as program}
					<li>
						<Card container={program} />
					</li>
				{/each}
			</ul>
		</div>

		<div class="details-tab" id="measures">
			<h3>{$_('measures')}</h3>
			<ul class="carousel">
				{#each measures as measure}
					<li>
						<Card container={measure} />
					</li>
				{/each}
			</ul>
		</div>
	</article>
</form>

<style>
	header {
		align-items: center;
		display: flex;
		gap: 0.75rem;
	}

	h2 {
		margin: 0;
		min-height: 3rem;
	}
</style>
