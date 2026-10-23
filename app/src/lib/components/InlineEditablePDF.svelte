<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Upload from '~icons/flowbite/arrow-up-from-bracket-outline';
	import FilePDF from '~icons/flowbite/file-pdf-outline';
	import Close from '~icons/knotdots/close';
	import tooltip from '$lib/attachments/tooltip';
	import requestSubmit from '$lib/client/requestSubmit';
	import { uploadAsFormData } from '$lib/client/upload';
	import Dropdown from '$lib/components/Dropdown.svelte';
	import transformFileURL from '$lib/transformFileURL';

	interface Props {
		editable?: boolean;
		value: string[][];
	}

	let { editable = false, value = $bindable() }: Props = $props();

	let uploadInProgress = $state(false);

	function remove(index: number) {
		return (event: Event) => {
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

{#if value.length > 1}
	<Dropdown offset={[-4, 4]}>
		{#snippet button(popover)}
			<button
				{@attach tooltip($_('pdf'))}
				class="dropdown-button dropdown-button--select"
				type="button"
				use:popover.button
			>
				{#each value.slice(0, 1) as pdf (pdf[0])}
					<a
						class="badge badge--large badge--gray"
						href={transformFileURL(pdf[0])}
						rel="noopener noreferrer"
						target="_blank"
					>
						<FilePDF />
						<span class="truncated">{pdf[1]}</span>
					</a>
				{/each}

				<span class="badge badge--large badge--gray">
					{$_('n_more', { values: { count: value.length - 1 } })}
				</span>
			</button>
		{/snippet}

		{#snippet panel()}
			<ul>
				{#each value as pdf, i (pdf[0])}
					<li>
						{#if editable}
							<span class="badge badge--gray">
								<FilePDF />
								<span class="truncated">{pdf[1]}</span>

								<button
									class="button button-remove"
									onclick={remove(i)}
									type="button"
									{@attach tooltip($_('upload.pdf.remove'))}
								>
									<Close />
								</button>
							</span>
						{:else}
							<a
								class="badge badge--large badge--gray"
								href={transformFileURL(pdf[0])}
								rel="noopener noreferrer"
								target="_blank"
							>
								<FilePDF />
								<span class="truncated">{pdf[1]}</span>
							</a>
						{/if}
					</li>
				{/each}

				{#if editable}
					<li>
						{const id = crypto.randomUUID()}

						{#if uploadInProgress}
							<span class="badge badge--large badge--gray">
								<span class="loader"></span>
								{$_('pdf.')}
							</span>}
						{:else}
							<label class="badge badge--large badge--unstyled" for={id}>
								<Upload />
								{$_('upload.pdf.choose')}
							</label>

							<input
								accept="application/pdf"
								class="is-visually-hidden"
								{id}
								multiple
								name="pdf"
								oninput={upload}
								type="file"
							/>
						{/if}
					</li>
				{/if}
			</ul>
		{/snippet}
	</Dropdown>
{:else if value.length == 1}
	<a
		class="badge badge--large badge--gray"
		href={transformFileURL(value[0][0])}
		rel="noopener noreferrer"
		target="_blank"
	>
		<span class="truncated">{value[0][1]}</span>
	</a>
{:else}
	{const id = crypto.randomUUID()}

	{#if uploadInProgress}
		<span class="badge badge--large badge--gray">
			<span class="loader"></span>
			{$_('pdf')}
		</span>}
	{:else if editable}
		<label class="badge badge--large badge--file-upload" for={id}>
			<Upload />
			{$_('upload.pdf.choose')}
		</label>

		<input
			accept="application/pdf"
			class="is-visually-hidden"
			{id}
			multiple
			name="pdf"
			oninput={upload}
			type="file"
		/>
	{/if}
{/if}

<style>
	li {
		display: flex;
		padding: 0.125rem 0rem;
	}

	.badge {
		min-width: 0;
	}

	.badge.badge--file-upload {
		--badge-background-color: var(--color-white);
		--badge-color: var(--color-text-muted);
		--badge-icon-color: var(--color-icon-accent-default);

		border: dashed 1px var(--color-border-default);
	}

	.badge.badge--unstyled {
		--badge-background-color: var(--color-white);
		--badge-color: var(--color-text-accent-default);
	}

	.button-remove {
		--button-active-background: transparent;
		--button-hover-background: transparent;
		--padding-x: 0;
		--padding-y: 0.125rem;

		border: none;
		flex-shrink: 0;
	}

	.button-remove > :global(svg) {
		color: var(--color-gray-500);
		height: 1rem;
		width: 1rem;
	}

	.loader {
		--size: 1rem;

		width: var(--size);
		height: var(--size);
		border: 2px solid rgba(from var(--color-gray-500) r g b / 0.25);
		border-bottom-color: var(--color-gray-500);
		border-radius: 50%;
		display: inline-block;
		box-sizing: border-box;
		animation: rotation 1s linear infinite;
	}

	@keyframes rotation {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}
</style>
