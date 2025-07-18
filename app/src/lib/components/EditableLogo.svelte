<script lang="ts">
	import { createPopover } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import TrashBin from '~icons/flowbite/trash-bin-outline';
	import Plus from '~icons/heroicons/plus-solid';
	import PlaceholderImage from '~icons/knotdots/placeholder-image';
	import requestSubmit from '$lib/client/requestSubmit';
	import { uploadAsFormData } from '$lib/client/upload';

	interface Props {
		editable?: boolean;
		value: string | undefined;
	}

	let { editable = false, value = $bindable() } = $props();

	let uploadInProgress = $state(false);

	const popover = createPopover({});

	const [popperRef, popperContent] = createPopperActions({
		placement: 'top-start',
		strategy: 'absolute'
	});

	function remove(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		value = undefined;
		requestSubmit(event);
	}

	async function upload(event: Event) {
		event.stopPropagation();
		const input = event.currentTarget as HTMLInputElement;
		if (input.files instanceof FileList && input.files.length > 0) {
			try {
				uploadInProgress = true;
				value = await uploadAsFormData(input.files[0]);
				input.form?.requestSubmit();
			} catch (e) {
				console.log(e);
			} finally {
				uploadInProgress = false;
			}
		}
	}
</script>

{#if editable}
	{#if value}
		<div class="dropdown" use:popperRef>
			<button class="dropdown-button" type="button" use:popover.button>
				<img alt={$_('logo')} class="logo" src={value} />
			</button>
			{#if $popover.expanded}
				<div class="dropdown-panel" use:popperContent use:popover.panel>
					<button onclick={remove} type="button"><TrashBin />{$_('upload.image.remove')}</button>
				</div>
			{/if}
		</div>
	{:else if uploadInProgress}
		<div class="logo-upload">
			<span class="loader" role="status"></span>
		</div>
	{:else}
		<label class="logo-upload" for="image">
			<span class="is-visually-hidden">{$_('upload.image.choose')}</span>
			<PlaceholderImage />
			<Plus />
		</label>
		<input
			accept="image/png,image/jpeg"
			class="is-visually-hidden"
			id="image"
			oninput={upload}
			type="file"
		/>
	{/if}
{:else if value}
	<img alt={$_('image')} class="logo" src={value} />
{/if}

<style>
	.logo {
		height: 2.25rem;
	}

	.logo-upload {
		border: 2px solid var(--color-gray-200);
		border-radius: 4px;
		display: grid;
		height: 3rem;
		padding: 0.375rem;
		place-content: center;
		width: 3rem;
	}

	label > :global(svg:first-of-type) {
		color: var(--color-gray-500);
		display: block;
	}

	label > :global(svg:last-of-type) {
		display: none;
	}

	label:hover {
		background-color: var(--color-gray-100);
		color: var(--color-gray-800);
	}

	label:hover > :global(svg:first-of-type) {
		display: none;
	}

	label:hover > :global(svg:last-of-type) {
		display: block;
	}

	.dropdown-button {
		--button-active-background: transparent;
		--button-background: transparent;
		--button-border-color: transparent;
		--button-hover-background: transparent;

		border: none;
		padding: 0;
	}

	.dropdown-button:global([aria-expanded]) {
		background-color: transparent;
	}

	.dropdown-panel {
		border-radius: 16px;
		max-width: revert;
	}

	.dropdown-panel button {
		--button-active-background: var(--color-gray-100);
		--button-hover-background: var(--color-gray-100);
		--padding-y: 0.5rem;
		--padding-x: 1rem;

		border: none;
		white-space: nowrap;
	}

	.dropdown-panel button > :global(svg) {
		color: var(--color-gray-800);
		max-width: none;
	}
</style>
