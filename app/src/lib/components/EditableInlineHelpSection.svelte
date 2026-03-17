<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import Editor from '$lib/components/Editor.svelte';
	import Viewer from '$lib/components/Viewer.svelte';
	import { type AnyContainer, isTextContainer } from '$lib/models';
	import { ability } from '$lib/stores';

	interface Props {
		container: AnyContainer;
		editable?: boolean;
		parentContainer: AnyContainer;
		relatedContainers: AnyContainer[];
	}

	let {
		container = $bindable(),
		editable = false,
		parentContainer = $bindable(),
		relatedContainers = $bindable()
	}: Props = $props();
</script>

{#if isTextContainer(container)}
	<header>
		<span class="badge badge--inline-help">{$_('inline_help')}</span>
		{#if editable}
			<ul class="inline-actions is-visible-on-hover">
				<li>
					<ContainerSettingsDropdown bind:container bind:parentContainer bind:relatedContainers />
				</li>
			</ul>
		{/if}
	</header>

	<div class="inline-help-content">
		{#if editable && $ability.can('update', container)}
			<Editor bind:value={container.payload.body} />
		{:else}
			<Viewer value={container.payload.body} />
		{/if}
	</div>
{/if}

<style>
	header {
		margin-bottom: 0.5rem;
	}

	.inline-help-content :global(.markdown-body),
	.inline-help-content :global(.markdown-body p),
	.inline-help-content :global(.markdown-body li) {
		color: var(--color-gray-600);
		font-size: 1rem;
		font-weight: 500;
		line-height: 1.5;
	}

	.inline-help-content :global(.markdown-body ul) {
		margin: 0;
		padding-left: 1.5rem;
	}

	.badge.badge--inline-help {
		--badge-background-color: var(--color-yellow-100);
		--badge-color: var(--color-yellow-800);
	}
</style>
