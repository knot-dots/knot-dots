<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import { _ } from 'svelte-i18n';
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

	const init: Attachment = (element) => {
		if (container.payload.title == '') {
			(element as HTMLElement).focus();
		}
	};

	function handleKeyDown(event: KeyboardEvent & { currentTarget: HTMLTextAreaElement }) {
		if (event.key === 'Enter') {
			event.preventDefault();
		}
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
	{#if editable && $ability.can('update', container)}
		<p class="details-heading title">
			<label class="is-visually-hidden" for={idForTitle}>{$_('title')}</label>
			<textarea
				{@attach init}
				bind:value={container.payload.title}
				id={idForTitle}
				onkeydown={handleKeyDown}
				placeholder={$_('chapter.title.placeholder')}
				rows="1"
			></textarea>
		</p>
	{:else}
		<svelte:element
			this={`h${Math.min(container.payload.number.split('.').length + 1, 6)}`}
			class="details-heading"
		>
			{container.payload.title}
		</svelte:element>
	{/if}
</div>

<style>
	header {
		margin-bottom: 0;
		min-height: 2.5rem;
	}

	.details-heading {
		color: var(--color-gray-800);
		font-size: 1.875rem;
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
		align-items: center;
		display: flex;
		gap: 0.75rem;
	}

	.heading button {
		margin-left: auto;
	}

	.title {
		display: grid;
	}

	.title::after {
		content: attr(data-replicated-value) ' ';
		visibility: hidden;
		white-space: pre-wrap;
	}

	.title > textarea {
		--outline-offset: 0.25rem;

		background-color: revert;
		min-height: 1.5rem;
		overflow: hidden;
		resize: none;
		width: calc(100% + 0.5rem);
	}

	.title::after,
	.title > textarea {
		border: none;
		border-radius: 8px;
		font: inherit;
		grid-area: 1 / 1 / 2 / 2;
		margin: 0;
		padding: 0;
	}
</style>
