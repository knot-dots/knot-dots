<script lang="ts">
	import { _ } from 'svelte-i18n';
	import TrashBin from '~icons/flowbite/trash-bin-outline';
	import Upload from '~icons/flowbite/upload-outline';
	import requestSubmit from '$lib/client/requestSubmit';
	import { uploadAsFormData } from '$lib/client/upload';

	interface Props {
		editable?: boolean;
		label: string;
		value: string | undefined;
	}

	let { editable = false, label, value = $bindable() } = $props();

	let uploadInProgress = $state(false);

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
	<label class="label" for="image">{label}</label>
	<div>
		<span class="value value--is-editable">
			{#if uploadInProgress}
				<span class="loader"></span>
			{:else if value}
				<img alt={$_('image')} src={value} />
				<button
					aria-label={$_('upload.image.remove')}
					class="button button-remove"
					onclick={remove}
					type="button"><TrashBin /></button
				>
			{:else}
				{$_('empty')}
			{/if}
		</span>

		<label class="button button-upload" for="image">
			<Upload />
			{$_('upload.image.choose')}
		</label>
		<input
			accept="image/png,image/jpeg"
			class="is-visually-hidden"
			id="image"
			oninput={upload}
			type="file"
		/>

		<p class="help">{$_('upload.image.help')}</p>
	</div>
{:else}
	<span class="label">{label}</span>
	<div>
		<span class="value">
			{#if value}
				<img alt={$_('image')} src={value} />
			{:else}
				{$_('empty')}
			{/if}
		</span>

		<p class="help">{$_('upload.image.help')}</p>
	</div>
{/if}

<style>
	div {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	img {
		height: 1.5rem;
	}

	label {
		flex-shrink: 0;
	}

	.button-remove {
		--button-active-background: transparent;
		--button-hover-background: transparent;
		--padding-x: 0.375rem;
		--padding-y: 0.375rem;

		border: none;
	}

	.button-remove > :global(svg) {
		height: 0.75rem;
		width: 0.75rem;
	}

	.button-upload {
		--button-border-color: var(--color-primary-700);
		--button-hover-background: var(--color-primary-700);
		--padding-x: 0.75rem;
		--padding-y: 0.5rem;

		border-radius: 4px;
		color: var(--color-primary-700);
		font-size: 0.75rem;
	}

	.button-upload > :global(svg) {
		height: 0.75rem;
		width: 0.75rem;
	}

	.button-upload:hover {
		color: white;
	}

	.help {
		flex-basis: 100%;
		font-size: 0.75rem;
		font-weight: 400;
		margin-top: 0;
	}

	.value {
		align-items: center;
		background-color: var(--form-control-background);
		border-radius: 4px;
		display: flex;
		flex-grow: 1;
		gap: 0.5rem;
		justify-content: space-between;
		min-height: 2.25rem;
		padding: 0.375rem 0.5rem;
	}

	.value.value--is-editable:hover {
		background-color: var(--color-gray-100);
	}
</style>
