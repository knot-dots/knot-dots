<script lang="ts">
	import { _ } from 'svelte-i18n';
	import AutoresizingTextarea from '$lib/components/AutoresizingTextarea.svelte';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import EditableLogo from '$lib/components/EditableLogo.svelte';
	import { type AnyContainer, type ChapterContainer } from '$lib/models';
	import { ability } from '$lib/stores';

	interface Props {
		container: ChapterContainer;
		editable?: boolean;
		parentContainer: AnyContainer;
		relatedContainers: AnyContainer[];
	}

	let {
		container = $bindable(),
		editable = false,
		parentContainer = $bindable(),
		relatedContainers = $bindable()
	}: Props = $props();

	const idForNumber = crypto.randomUUID();

	const idForTitle = crypto.randomUUID();

	function handleInputNumber(event: Event) {
		const input = event.currentTarget as HTMLInputElement;

		if (!input.validity.valid) {
			event.stopPropagation();
		}

		container.payload.number = input.value;
	}
</script>

<header>
	{#if editable && $ability.can('update', container)}
		<p class="number">
			<label class="is-visually-hidden" for={idForNumber}>{$_('chapter_number')}</label>
			<input
				id={idForNumber}
				oninput={handleInputNumber}
				pattern="^\d+(\.\d+)*$"
				type="text"
				value={container.payload.number}
			/>
		</p>
	{:else}
		<p class="number">{container.payload.number}</p>
	{/if}

	{#if editable}
		<ul class="inline-actions is-visible-on-hover">
			<li>
				<ContainerSettingsDropdown bind:container bind:parentContainer bind:relatedContainers />
			</li>
		</ul>
	{/if}
</header>

<div class="heading">
	<EditableLogo
		bind:value={container.payload.image}
		editable={editable && $ability.can('update', container)}
	/>
	<svelte:element
		this={`h${Math.min(container.payload.number.split('.').length + 1, 6)}`}
		class="details-heading"
	>
		{#if editable && $ability.can('update', container)}
			<label class="is-visually-hidden" for={idForTitle}>{$_('title')}</label>
			<AutoresizingTextarea
				bind:value={container.payload.title}
				id={idForTitle}
				onkeydown={(e) => {
					if (e.key === 'Enter') {
						e.preventDefault();
					}
				}}
				placeholder={$_('chapter.title.placeholder')}
				rows={1}
			/>
		{:else}
			{container.payload.title}
		{/if}
	</svelte:element>
</div>

<style>
	header {
		margin-bottom: 0;
		min-height: 2.5rem;
	}

	.number {
		font-weight: 500;
	}

	.number > input {
		--outline-offset: 0.25rem;

		background-color: revert;
		border: none;
		line-height: 1.5;
		margin: 0;
		padding: 0;
		width: 3em;
	}

	.heading {
		--logo-height: 2.5rem;

		align-items: start;
		display: flex;
		gap: 0.75rem;
		min-height: var(--logo-height);
	}

	.heading > :global(:first-child) {
		flex-shrink: 0;
	}

	.heading button {
		margin-left: auto;
	}
</style>
