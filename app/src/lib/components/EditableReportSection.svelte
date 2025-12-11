<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Overlay from '~icons/knotdots/overlay';
	import { page } from '$app/state';
	import AutoresizingTextarea from './AutoresizingTextarea.svelte';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import Editor from '$lib/components/Editor.svelte';
	import Viewer from '$lib/components/Viewer.svelte';
	import { type AnyContainer, overlayKey, overlayURL, type ReportContainer } from '$lib/models';
	import { ability } from '$lib/stores';

	interface Props {
		container: ReportContainer;
		editable?: boolean;
		heading: 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
		parentContainer: AnyContainer;
		relatedContainers: AnyContainer[];
	}

	let {
		container = $bindable(),
		editable = false,
		heading,
		parentContainer = $bindable(),
		relatedContainers = $bindable()
	}: Props = $props();

	const idForTitle = crypto.randomUUID();
</script>

<header>
	<svelte:element this={heading} class="details-heading">
		{#if editable && $ability.can('update', container)}
			<label class="is-visually-hidden" for={idForTitle}>{$_('title')}</label>
			<AutoresizingTextarea
				bind:value={container.payload.title}
				id={idForTitle}
				placeholder={$_('chapter.title.placeholder')}
				rows={1}
			/>
		{:else}
			<a href={overlayURL(page.url, overlayKey.enum.view, container.guid)}>
				{container.payload.title}
			</a>
		{/if}
	</svelte:element>

	{#if editable}
		<ul class="inline-actions is-visible-on-hover">
			<li>
				<a
					class="action-button action-button--size-l"
					href={overlayURL(page.url, overlayKey.enum.view, container.guid)}
				>
					<Overlay />
					<span class="is-visually-hidden">{$_('open_in_overlay')}</span>
				</a>
			</li>
			<li>
				<ContainerSettingsDropdown bind:container bind:parentContainer bind:relatedContainers />
			</li>
		</ul>
	{/if}
</header>

{#if editable && $ability.can('update', container)}
	<Editor bind:value={container.payload.description} />
{:else}
	<Viewer value={container.payload.description} />
{/if}

<style>
	.action-button {
		display: inline-flex;
	}
</style>
