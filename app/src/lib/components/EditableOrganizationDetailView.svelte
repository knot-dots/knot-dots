<script lang="ts">
	import { _ } from 'svelte-i18n';
	import autoSave from '$lib/client/autoSave';
	import requestSubmit from '$lib/client/requestSubmit';
	import Card from '$lib/components/Card.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import EditableLogo from '$lib/components/EditableLogo.svelte';
	import EditableMultipleChoice from '$lib/components/EditableMultipleChoice.svelte';
	import EditableOrganizationCategory from '$lib/components/EditableOrganizationCategory.svelte';
	import EditableVisibility from '$lib/components/EditableVisibility.svelte';
	import {
		type Container,
		isContainerWithEffect,
		isContainerWithObjective,
		type OrganizationContainer
	} from '$lib/models';
	import { ability, applicationState } from '$lib/stores';

	export let container: OrganizationContainer;
	export let containersRelatedToIndicators: Container[] = [];
	export let indicators: Container[] = [];
	export let measures: Container[] = [];
	export let strategies: Container[] = [];

	const handleSubmit = autoSave(container, 2000);
</script>

<form on:input={requestSubmit} on:submit={handleSubmit} novalidate>
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
					on:keydown={(e) => (e.key === 'Enter' ? e.preventDefault() : null)}
				></h2>
			{:else}
				<h2 class="details-title" contenteditable="false">
					{container.payload.name}
				</h2>
			{/if}
		</header>

		<div class="details-tab" id="basic-data">
			<div class="data-grid">
				<EditableOrganizationCategory
					editable={$applicationState.containerDetailView.editable}
					bind:value={container.payload.organizationCategory}
				/>

				<EditableMultipleChoice
					editable={$applicationState.containerDetailView.editable}
					label={$_('boards')}
					options={['board.indicators', 'board.organizational_units'].map((o) => ({
						value: o,
						label: $_(o)
					}))}
					bind:value={container.payload.boards}
				/>

				{#if $ability.can('update', container, 'visibility')}
					<EditableVisibility
						editable={$applicationState.containerDetailView.editable}
						bind:value={container.payload.visibility}
					/>
				{/if}
			</div>
		</div>

		{#key container.guid}
			<EditableFormattedText
				editable={$applicationState.containerDetailView.editable}
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

		<div class="details-tab" id="strategies">
			<h3>{$_('strategies')}</h3>
			<ul class="carousel">
				{#each strategies as strategy}
					<li>
						<Card container={strategy} />
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
	}
</style>
