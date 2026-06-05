<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ExclamationCircle from '~icons/knotdots/exclamation-circle';
	import Video from '~icons/knotdots/video';
	import { env } from '$env/dynamic/public';
	import requestSubmit from '$lib/client/requestSubmit';
	import IgniteVideoSettingsDropdown from '$lib/components/IgniteVideoSettingsDropdown.svelte';
	import { igniteVideoURL } from '$lib/igniteVideo';
	import type { AnyContainer, IgniteVideoContainer } from '$lib/models';
	import { ability } from '$lib/stores';

	interface Props {
		container: IgniteVideoContainer;
		editable?: boolean;
		heading?: 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
		parentContainer: AnyContainer;
		relatedContainers: AnyContainer[];
	}

	let {
		container = $bindable(),
		editable = false,
		heading = 'h2',
		parentContainer = $bindable(),
		relatedContainers = $bindable()
	}: Props = $props();

	let urlInput = $state(container.payload.iframeUrl ?? '');

	const urlInputValid = $derived(
		Boolean(igniteVideoURL(urlInput, env.PUBLIC_IGNITE_VIDEO_ALLOWED_ORIGINS))
	);

	const iframeSrc = $derived(
		igniteVideoURL(container.payload.iframeUrl, env.PUBLIC_IGNITE_VIDEO_ALLOWED_ORIGINS)
	);
	const mayEdit = $derived(editable && $ability.can('update', container));
	const hasInvalidUrl = $derived(!urlInputValid && urlInput.trim() !== '');

	function handleEmbed(event: MouseEvent) {
		if (urlInputValid) {
			container.payload.iframeUrl = urlInput.trim();
			requestSubmit(event);
		}
	}
</script>

<header>
	{#if mayEdit}
		<svelte:element
			this={heading}
			bind:textContent={container.payload.title}
			class="details-heading"
			class:is-empty={!container.payload.title?.trim()}
			contenteditable="plaintext-only"
			data-placeholder={$_('ignite_video.title.placeholder')}
			onkeydown={(e) => (e.key === 'Enter' ? e.preventDefault() : null)}
			role="heading"
		></svelte:element>
	{:else}
		<svelte:element this={heading} class="details-heading" contenteditable="false">
			{container.payload.title}
		</svelte:element>
	{/if}

	{#if editable}
		<ul class="inline-actions is-visible-on-hover">
			<li>
				<IgniteVideoSettingsDropdown
					bind:container
					bind:parentContainer
					bind:relatedContainers
					hasValidVideo={Boolean(iframeSrc)}
				/>
			</li>
		</ul>
	{/if}
</header>

{#if iframeSrc}
	<div class="video-frame">
		<iframe
			allow="autoplay; encrypted-media; picture-in-picture;"
			allowfullscreen
			loading="lazy"
			referrerpolicy="strict-origin-when-cross-origin"
			sandbox="allow-scripts allow-same-origin allow-presentation"
			src={iframeSrc}
			title={container.payload.title || $_('ignite_video')}
		></iframe>
	</div>
{:else}
	<div class="empty-panel">
		<div class="panel-header">
			<Video />
			<span>{$_('ignite_video.no_content')}</span>
		</div>

		{#if mayEdit}
			<div class="controls" oninput={(event) => event.stopPropagation()}>
				<div class="input-row" class:invalid={hasInvalidUrl}>
					<input
						aria-invalid={hasInvalidUrl}
						placeholder={$_('ignite_video.placeholder')}
						type="url"
						bind:value={urlInput}
					/>
					{#if hasInvalidUrl}
						<span class="error-label">
							{$_('ignite_video.unsupported')}
							<ExclamationCircle />
						</span>
					{/if}
				</div>
				<button disabled={!urlInputValid} type="button" onclick={handleEmbed}>
					{$_('ignite_video.embed')}
				</button>
				<p class="hint">{$_('ignite_video.url_help')}</p>
			</div>
		{/if}
	</div>
{/if}

<style>
	.details-heading.is-empty::before {
		color: var(--color-gray-400);
		content: attr(data-placeholder);
		pointer-events: none;
	}

	.video-frame {
		aspect-ratio: 16 / 9;
		background: var(--color-gray-050);
		border-radius: 8px;
		overflow: hidden;
		width: 100%;
	}

	iframe {
		border: 0;
		height: 100%;
		width: 100%;
	}

	.empty-panel {
		background: var(--color-gray-025);
		border-radius: 8px;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 1rem;
		gap: 0.75rem;
		width: 100%;
	}

	.panel-header {
		align-items: center;
		color: var(--color-gray-500);
		display: flex;
		font-size: 0.875rem;
		gap: 0.375rem;
		line-height: 1.5;
		width: 100%;
	}

	.panel-header :global(svg) {
		color: var(--color-gray-500);
		flex: 0 0 auto;
		height: 1.25rem;
		width: 1.25rem;
	}

	.controls {
		align-items: stretch;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: 100%;
	}

	.input-row {
		align-items: center;
		background: var(--color-gray-050);
		border: 1px solid var(--color-gray-200);
		border-radius: 4px;
		display: flex;
		gap: 0.5rem;
		min-height: 2.25rem;
		padding: 0.375rem;
		width: 100%;
	}

	.input-row.invalid {
		background: var(--color-red-050);
		border-color: var(--color-red-200);
	}

	input {
		background: transparent;
		border: 0;
		color: var(--color-gray-900);
		flex: 1 1 auto;
		font: inherit;
		min-width: 0;
		outline: none;
		padding: 0 0.125rem;
		width: 100%;
	}

	input::placeholder {
		color: var(--color-gray-500);
	}

	.input-row.invalid input {
		color: var(--color-red-500);
	}

	.error-label {
		align-items: center;
		color: var(--color-red-700);
		display: flex;
		flex: 0 0 auto;
		font-size: 0.875rem;
		font-weight: 500;
		gap: 0.125rem;
		line-height: 1.5;
		white-space: nowrap;
	}

	.error-label :global(svg) {
		color: var(--color-red-700);
		flex: 0 0 auto;
		height: 1.25rem;
		width: 1.25rem;
	}

	button {
		align-items: center;
		background: var(--color-primary-700);
		border: 0;
		border-radius: 8px;
		color: white;
		display: flex;
		font-size: 0.75rem;
		font-weight: 500;
		justify-content: center;
		line-height: 1.5;
		min-height: 2.25rem;
		padding: 0.5rem 0.75rem;
		width: 100%;
	}

	button:disabled {
		background: var(--color-gray-300);
		opacity: 1;
	}

	.hint {
		color: var(--color-gray-500);
		font-size: 0.75rem;
		line-height: 1.5;
		margin: 0;
		text-align: center;
		width: 100%;
	}
</style>
