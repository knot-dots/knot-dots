<script lang="ts">
	import { untrack } from 'svelte';
	import type { createDisclosure } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import Close from '~icons/knotdots/close';
	import Plus from '~icons/knotdots/plus';
	import ProgramPicker from '$lib/components/ProgramPicker.svelte';
	import { getReviewContext } from '$lib/contexts/review.svelte';

	interface Props {
		disclosure: ReturnType<typeof createDisclosure>;
	}

	let { disclosure }: Props = $props();

	const review = getReviewContext();

	// svelte-ignore non_reactive_update
	let dialog: HTMLDialogElement;

	function openPicker() {
		dialog?.showModal();
	}

	// Open the picker dialog when the review bar is expanded but no programs are selected
	$effect(() => {
		if ($disclosure.expanded && untrack(() => review.selectedPrograms.length === 0)) {
			openPicker();
		}
	});
</script>

<ProgramPicker bind:dialog bind:selected={review.selectedPrograms} />

{#if $disclosure.expanded}
	<fieldset class="review-bar" use:disclosure.panel>
		<span class="aria-hidden">{$_('review_with')}</span>

		{#if review.selectedPrograms.length > 0}
			<button
				aria-label={$_('review_clear_all')}
				class="button-outline button-xs"
				onclick={() => (review.selectedPrograms = [])}
				type="button"
			>
				<Close />
			</button>
		{/if}

		{#each review.selectedPrograms as program (program.guid)}
			<div class="badge badge--large badge--program">
				<span class="program-title">{program.payload.title}</span>
				<button
					class="program-remove"
					onclick={() =>
						(review.selectedPrograms = review.selectedPrograms.filter(
							({ guid }) => guid !== program.guid
						))}
					title={$_('remove')}
					type="button"
				>
					<Close />
				</button>
			</div>
		{/each}

		<button
			class="program-add"
			disabled={review.selectedPrograms.length >= 5}
			onclick={openPicker}
			type="button"
		>
			<Plus />
			{$_('review_add_program')}
		</button>
	</fieldset>
{/if}

<style>
	.review-bar {
		--indicator-background-color: var(--color-primary-700);

		align-items: center;
		background-color: var(--color-primary-050);
		border: 1px solid var(--color-primary-200);
		border-radius: 9999rem;
		display: flex;
		flex-direction: row;
		font-size: 0.875rem;
		gap: 0.25rem;
		justify-content: safe center;
		overflow: auto;
		padding: 0.375rem;
	}

	.review-bar > * {
		flex-shrink: 0;
		justify-content: safe center;
	}

	.review-bar > span:first-child {
		color: var(--color-primary-700);
		padding: 0 0.25rem 0 0.5rem;
	}

	.review-bar > button:first-of-type {
		margin-right: 0.75rem;
	}

	.badge.badge--program {
		border: 1px solid var(--color-primary-100);
	}

	.program-title {
		color: var(--color-gray-900);
		font-size: 0.875rem;
		font-weight: 500;
		flex-shrink: 1;
		max-width: 10rem;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.program-remove {
		background: transparent;
		border: none;
		color: var(--color-gray-500);
		cursor: pointer;
		flex-shrink: 0;
		padding: 0;
	}

	.program-remove :global(svg) {
		height: 1rem;
		width: 1rem;
	}

	.program-add {
		--button-background: transparent;
		--button-active-background: var(--color-primary-300);
		--button-disabled-background: transparent;
		--button-hover-background: var(--color-primary-100);

		border: none;
		color: var(--color-gray-700);
		padding: 0.5rem 0.625rem;
		white-space: nowrap;
	}

	.program-add:active {
		color: var(--color-primary-700);
	}

	.program-add:disabled {
		color: var(--color-gray-400);
	}

	.program-add :global(svg) {
		height: 0.875rem;
		width: 0.875rem;
	}
</style>
