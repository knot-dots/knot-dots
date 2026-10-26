<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Refresh from '~icons/flowbite/refresh-outline';
	import TrashBin from '~icons/flowbite/trash-bin-outline';
	import PlaceholderImage from '~icons/flowbite/image-outline';
	import requestSubmit from '$lib/client/requestSubmit';
	import transformFileURL from '$lib/transformFileURL.js';
	import Dropdown from '$lib/components/Dropdown.svelte';
	import { uploadAsFormData } from '$lib/client/upload';

	interface Props {
		editable?: boolean;
		label: string;
		value: string | undefined;
		allowedFileTypes?: string[];
	}

	let {
		editable = false,
		label,
		value = $bindable(),
		allowedFileTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp', 'image/avif']
	}: Props = $props();

	let uploadInProgress = $state(false);

	// svelte-ignore non_reactive_update
	let input: HTMLInputElement;

	const id = crypto.randomUUID();

	async function upload(event: Event) {
		event.stopPropagation();
		const input = event.currentTarget as HTMLInputElement;
		const form = input.form;
		if (input.files instanceof FileList && input.files.length > 0) {
			try {
				uploadInProgress = true;
				value = await uploadAsFormData(input.files[0]);
				form?.requestSubmit();
			} catch (e) {
				console.log(e);
			} finally {
				uploadInProgress = false;
				// Allows choosing the same file again after removing it
				input.value = '';
			}
		}
	}

	function remove(event: Event) {
		value = undefined;
		requestSubmit(event);
	}
</script>

{#if editable}
	{#if uploadInProgress}
		<span class="badge badge--large badge--gray">
			<span class="loader system-primary"></span>
			{label}
		</span>
	{:else if value}
		<Dropdown --dropdown-panel-maxwidth="revert" --dropdown-panel-border-radius="16px">
			{#snippet button(popover)}
				<button class="dropdown-button" type="button" use:popover.button>
					<span class="badge badge--large badge--gray">
						<img alt="" src={transformFileURL(value!)} />
						{label}
					</span>
				</button>
			{/snippet}

			{#snippet panel(popover)}
				<ul class="menu">
					<li class="menu-item">
						<button
							onclick={() => {
								popover.close();
								input.click();
							}}
							type="button"
						>
							<Refresh />{$_('upload.image.replace')}
						</button>
					</li>

					<li class="menu-item">
						<button onclick={remove} type="button">
							<TrashBin />{$_('upload.image.remove')}
						</button>
					</li>
				</ul>
			{/snippet}
		</Dropdown>
	{:else}
		<label class="badge badge--large badge--file-upload" for={id}>
			<PlaceholderImage />
			{label}
		</label>
	{/if}

	<input
		accept={allowedFileTypes.join(',')}
		bind:this={input}
		class="is-visually-hidden"
		{id}
		oninput={upload}
		type="file"
	/>
{:else if value}
	<span class="badge badge--large badge--gray">
		<img alt="" src={transformFileURL(value)} />
		{label}
	</span>
{/if}

<style>
	.badge {
		display: flex;
	}

	.badge.badge--file-upload {
		--badge-background-color: var(--color-white);
		--badge-color: var(--color-text-muted);
		--badge-icon-color: var(--color-icon-accent-default);

		border: dashed 1px var(--color-border-default);
	}

	.badge:has(img) {
		padding-left: 0;
	}

	.badge > img {
		border-radius: 8px;
		height: 1.625rem;
	}

	.menu-item :global(svg) {
		height: 1rem;
		width: 1rem;
	}
</style>
