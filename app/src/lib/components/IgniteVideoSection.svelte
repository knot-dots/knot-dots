<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Video from '~icons/knotdots/video';
	import requestSubmit from '$lib/client/requestSubmit';
	import AutoresizingTextarea from '$lib/components/AutoresizingTextarea.svelte';
	import IgniteVideoSettingsDropdown from '$lib/components/IgniteVideoSettingsDropdown.svelte';
	import type { AnyPayload, Container, IgniteVideoContainer } from '$lib/models';
	import { ability } from '$lib/stores';

	interface Props {
		container: IgniteVideoContainer;
		editable?: boolean;
		heading?: 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
		parentContainer: Container<AnyPayload>;
		relatedContainers: Container<AnyPayload>[];
	}

	let {
		container = $bindable(),
		editable = false,
		heading = 'h2',
		parentContainer = $bindable(),
		relatedContainers = $bindable()
	}: Props = $props();

	const playerSettings = {
		colorPrimary: '#1a56db', // color-primary-700
		colorSecondary: '#44546e', // color-gray-700
		colorBackground: '#eff6ff'
	};

	let iframeUrl = $state(container.payload.iframeUrl ?? '');

	const mayEdit = $derived(editable && $ability.can('update', container));

	function handleInputIframeUrl(event: Event & { currentTarget: HTMLInputElement }) {
		event.stopPropagation();

		if (event.currentTarget.validity.valid) {
			iframeUrl = event.currentTarget.value;
		}
	}

	function handleEmbed(event: Event) {
		container.payload.iframeUrl = iframeUrl;
		requestSubmit(event);
	}
</script>

<header>
	<svelte:element this={heading} class="details-heading">
		{#if mayEdit}
			{@const id = crypto.randomUUID()}
			<label class="is-visually-hidden" for={id}>{$_('title')}</label>
			<AutoresizingTextarea
				bind:value={container.payload.title}
				{id}
				onkeydown={(e) => {
					if (e.key === 'Enter') {
						e.preventDefault();
					}
				}}
				placeholder={$_('ignite_video.title.placeholder')}
				rows={1}
			/>
		{:else}
			{container.payload.title}
		{/if}
	</svelte:element>

	{#if editable}
		<ul class="inline-actions is-visible-on-hover">
			<li>
				<IgniteVideoSettingsDropdown bind:container bind:parentContainer bind:relatedContainers />
			</li>
		</ul>
	{/if}
</header>

{#if container.payload.iframeUrl}
	<div class="video-frame">
		<iframe
			allow="autoplay; encrypted-media; picture-in-picture;"
			allowfullscreen
			loading="lazy"
			referrerpolicy="strict-origin-when-cross-origin"
			sandbox="allow-scripts allow-same-origin allow-presentation"
			src={container.payload.iframeUrl +
				'&colorPrimary=' +
				encodeURIComponent(playerSettings.colorPrimary) +
				'&colorSecondary=' +
				encodeURIComponent(playerSettings.colorSecondary) +
				'&colorBackground=' +
				encodeURIComponent(playerSettings.colorBackground)}
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
			{@const id = crypto.randomUUID()}
			<div class="controls" oninput={(event) => event.stopPropagation()}>
				<label class="is-visually-hidden" for={id}>
					{$_('ignite_video.placeholder')}
				</label>
				<input
					{id}
					oninput={handleInputIframeUrl}
					pattern="https:\/\/knotdots\.euvideocdn\.com\/player\/index\.html\?id=.+"
					placeholder={$_('ignite_video.placeholder')}
					required
					type="url"
					value={container.payload.iframeUrl}
				/>
				<button class="button-primary" disabled={!iframeUrl} type="button" onclick={handleEmbed}>
					{$_('ignite_video.embed')}
				</button>
				<p class="hint">{$_('ignite_video.url_help')}</p>
			</div>
		{/if}
	</div>
{/if}

<style>
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
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: 100%;
	}

	.button-primary {
		justify-content: center;
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
