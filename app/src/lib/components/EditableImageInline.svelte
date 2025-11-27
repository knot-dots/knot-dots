<script lang="ts">
	import { _ } from 'svelte-i18n';
    import PlaceholderImage from '~icons/knotdots/placeholder-image';
	import requestSubmit from '$lib/client/requestSubmit';
	import { uploadAsFormData } from '$lib/client/upload';
	import transformFileURL from '$lib/transformFileURL.js';
    import {createPopover} from "svelte-headlessui";
    import {createPopperActions} from "svelte-popperjs";
    import TrashBin from '~icons/flowbite/trash-bin-outline';

	interface Props {
		editable?: boolean;
		label: string;
		value: string | undefined;
	}

	let { editable = false, label, value = $bindable() }: Props = $props();

	let uploadInProgress = $state(false);

	const id = crypto.randomUUID();

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

{#if editable && !value}
	<label class="placeholder" style="">
		<div style="display: flex; align-items: center; gap: 0.5rem;">
			<PlaceholderImage />
			{label}
		</div>
		<input
				name="image"
				accept="image/png,image/jpeg,image/svg+xml"
				class="is-visually-hidden"
				{id}
				oninput={upload}
				type="file"
		/>
	</label>

{:else if value}
	{#if editable}
		<div class="full" use:popperRef>
			<img use:popover.button alt={$_('logo')} class="logo" src={transformFileURL(value)} />
		</div>
	{:else}
		<div class="full">
			<img alt={$_('logo')} class="logo" src={transformFileURL(value)} />
		</div>
	{/if}
	{#if $popover.expanded}
		<div class="dropdown-panel" use:popperContent use:popover.panel>
			<button onclick={remove} type="button"><TrashBin />{$_('upload.image.remove')}</button>
		</div>
	{/if}
{/if}

<style>
	.full {
		width: 100%;
		height: 100%;
		overflow: hidden;
		position: relative;
        border-radius: 0.5rem;
	}
	.full > img {
		position: absolute;
		width: 100%;
		height: auto;
		object-fit: cover;
	}
    .placeholder {
		padding: 1rem;
		background-color: var(--color-gray-050);
		border-radius: 0.5rem;
		border: 1px solid var(--color-gray-200);
		color: 1px solid var(--color-gray-600);
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		justify-content: center;
    }
	img {
		border-radius: 0.5rem;
	}
</style>
