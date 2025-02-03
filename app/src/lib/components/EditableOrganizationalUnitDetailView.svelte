<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Card from '$lib/components/Card.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import EditableMultipleChoice from '$lib/components/EditableMultipleChoice.svelte';
	import EditableNumber from '$lib/components/EditableNumber.svelte';
	import EditableSuperordinateOrganizationalUnit from '$lib/components/EditableSuperordinateOrganizationalUnit.svelte';
	import {
		type Container,
		isContainerWithEffect,
		isIndicatorContainer,
		isStrategyContainer,
		type OrganizationalUnitContainer
	} from '$lib/models';
	import { ability, applicationState } from '$lib/stores';

	export let container: OrganizationalUnitContainer;
	export let relatedContainers: Container[];

	let timer: ReturnType<typeof setTimeout>;

	function debouncedSubmit(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		clearTimeout(timer);
		timer = setTimeout(async () => {
			input.closest('form')?.requestSubmit();
		}, 2000);
	}
</script>

<article class="details details-editable">
	{#if 'image' in container.payload}
		<img alt="logo" class="logo" src={container.payload.image} />
	{/if}
	{#if $applicationState.containerDetailView.editable}
		<h2
			class="details-title"
			contenteditable="plaintext-only"
			bind:textContent={container.payload.name}
			on:keydown={(e) => (e.key === 'Enter' ? e.preventDefault() : null)}
			on:input={debouncedSubmit}
		></h2>
	{:else}
		<h2 class="details-title" contenteditable="false">
			{container.payload.name}
		</h2>
	{/if}

	<EditableFormattedText
		editable={$applicationState.containerDetailView.editable}
		label={$_('description')}
		bind:value={container.payload.description}
	/>

	{#if $ability.can('update', container)}
		<EditableNumber
			editable={$applicationState.containerDetailView.editable}
			label={$_('organizational_unit.level')}
			bind:value={container.payload.level}
		/>
	{/if}

	<EditableSuperordinateOrganizationalUnit
		editable={$applicationState.containerDetailView.editable}
		bind:container
	/>

	<EditableMultipleChoice
		editable={$applicationState.containerDetailView.editable}
		label={$_('boards')}
		options={['board.indicators'].map((o) => ({
			value: o,
			label: $_(o)
		}))}
		bind:value={container.payload.boards}
	/>

	{#if container.payload.boards.includes('board.indicators')}
		<div class="indicators">
			<h3>{$_('indicators')}</h3>
			<ul class="carousel">
				{#each relatedContainers.filter(isIndicatorContainer) as indicator}
					<li>
						<Card --height="100%" container={indicator} />
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<div class="strategies">
		<h3>{$_('strategies')}</h3>
		<ul class="carousel">
			{#each relatedContainers.filter(isStrategyContainer) as strategy}
				<li>
					<Card --height="100%" container={strategy} />
				</li>
			{/each}
		</ul>
	</div>

	<div class="measures">
		<h3>{$_('measures')}</h3>
		<ul class="carousel">
			{#each relatedContainers.filter(isContainerWithEffect) as measure}
				<li>
					<Card --height="100%" container={measure} />
				</li>
			{/each}
		</ul>
	</div>
</article>
