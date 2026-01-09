<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Caption from '~icons/flowbite/caption-outline';
	import UppyImageUploader from '$lib/components/UppyImageUploader.svelte';

	interface Props {
		editable?: boolean;
		label: string;
		value: string | undefined;
		altAttribute?: string;
	}

	let {
		editable = false,
		label,
		value = $bindable(),
		altAttribute = $bindable()
	}: Props = $props();

	let showAltText = $state(false);

	function onSuccess() {
		const form =
			document.querySelector(`[for="${id}"]`)?.closest('form') ||
			document.querySelector(`label`)?.closest('form');
		if (form) {
			form.requestSubmit();
		}
	}

	const id = crypto.randomUUID();
</script>

{#if editable}
	<div class="actions">
		<UppyImageUploader
			bind:value
			hideAltAttribute={true}
			{label}
			aspectRatio={16 / 9}
			class="action-button"
			mode="button"
			{onSuccess}
		/>

		{#if value}
			<div class="image-action-container">
				<button
					title={$_('image.alt_text')}
					class="action-button"
					onclick={() => {
						showAltText = !showAltText;
					}}
					type="button"
				>
					<Caption />
					{$_('image.alt_text')}
				</button>

				{#if value && showAltText}
					<div class="alt-text-container">
						<input
							class="alt-input"
							id="{id}-alt"
							type="text"
							bind:value={altAttribute}
							placeholder={$_('image.alt_text_placeholder')}
						/>
					</div>
				{/if}
			</div>
		{/if}
	</div>
{/if}

<style>
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.alt-text-container {
		position: absolute;
		margin-top: 1rem;
		left: 0;
		top: 1rem;
	}

	.alt-input {
		min-width: 12rem;
		border: 1px solid var(--color-gray-300, #d1d5db);
		border-radius: 4px;
		padding: 0.375rem 0.5rem;
		font-size: 0.875rem;
		line-height: 1.5;
		background-color: var(--form-control-background);
	}

	.alt-input:focus {
		outline: 2px solid var(--color-primary, #3b82f6);
		outline-offset: 2px;
	}
	.image-action-container {
		position: relative;
	}
</style>
