<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Upload from '~icons/flowbite/upload-outline';
	import Close from '~icons/knotdots/close';
	import requestSubmit from '$lib/client/requestSubmit';
	import { uploadAsFormData } from '$lib/client/upload';

	interface Props {
		editable?: boolean;
		value: string[][];
	}

	let { editable = false, value = $bindable() } = $props();

	let uploadInProgress = $state(false);

	function remove(index: number) {
		return (event: Event) => {
			const input = event.currentTarget as HTMLInputElement;
			value = [...value.slice(0, index), ...value.slice(index + 1)];
			requestSubmit(event);
		};
	}

	async function upload(event: Event) {
		event.stopPropagation();
		const input = event.currentTarget as HTMLInputElement;
		if (input.files instanceof FileList && input.files.length > 0) {
			try {
				uploadInProgress = true;
				value = value.concat(
					await Promise.all(
						Array.from(input.files)
							.filter((f) => f instanceof File && f.size > 0)
							.map(async (f) => [await uploadAsFormData(f), f.name])
					)
				);
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
	<label class="label" for="file">{$_('files')}</label>
	<div>
		<span class="value value--is-editable">
			{#if uploadInProgress}
				<span class="loader"></span>
			{:else if value}
				{#each value as file, i}
					<span class="badge badge--gray">
						<span class="badge-text">{file[1]}</span>
						<button
							aria-label={$_('upload.file.remove')}
							class="button button-remove"
							onclick={remove(i)}
							type="button"
						>
							<Close />
						</button>
					</span>
				{:else}
					{$_('empty')}
				{/each}
			{:else}
				{$_('empty')}
			{/if}
		</span>

		<label class="button button-upload" for="file">
			<Upload />
			{$_('upload.file.choose')}
		</label>
		<input
			accept="application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
			class="is-visually-hidden"
			id="file"
			multiple
			oninput={upload}
			type="file"
		/>

		<p class="help">{$_('upload.file.help')}</p>
	</div>
{:else}
	<span class="label">{$_('files')}</span>
	<div>
		<ul class="value">
			{#each value as file, i}
				<li>
					<a class="badge badge--gray" href={file[0]}>
						<span class="badge-text">{file[1]}</span>
					</a>
				</li>
			{:else}
				<li>
					{$_('empty')}
				</li>
			{/each}
		</ul>

		<p class="help">{$_('upload.file.help')}</p>
	</div>
{/if}

<style>
	div {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	label {
		flex-shrink: 0;
	}

	.badge .badge-text {
		display: block;
		max-width: 10rem;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.badge .button {
		flex-shrink: 0;
	}

	.button-remove {
		--button-active-background: transparent;
		--button-hover-background: transparent;
		--padding-x: 0;
		--padding-y: 0.375rem;

		border: none;
	}

	.button-remove > :global(svg) {
		color: var(--color-gray-500);
		height: 0.5rem;
		width: 0.5rem;
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
		min-width: 0;
		padding: 0.375rem 0.5rem;
	}

	.value.value--is-editable:hover {
		background-color: var(--color-gray-100);
	}
</style>
