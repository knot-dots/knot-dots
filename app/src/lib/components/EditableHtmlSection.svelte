<script lang="ts">
	import { toDom } from 'hast-util-to-dom';
	import rehypeParse from 'rehype-parse';
	import type { Attachment } from 'svelte/attachments';
	import { unified } from 'unified';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import { type AnyPayload, type Container, type HtmlPayload } from '$lib/models';
	import { ability } from '$lib/stores';

	interface Props {
		container: Container<HtmlPayload>;
		editable?: boolean;
		parentContainer: Container<AnyPayload>;
		relatedContainers: Container<AnyPayload>[];
	}

	let {
		container = $bindable(),
		editable = false,
		parentContainer = $bindable(),
		relatedContainers = $bindable()
	}: Props = $props();

	/**
	 * Appends the given HTML content to an element
	 *
	 * Beware: any script tags in the content will be executed.
	 */
	function appendHTML(content: string): Attachment<HTMLElement> {
		return (element) => {
			element.innerHTML = '';
			element.appendChild(
				toDom(unified().use(rehypeParse, { fragment: true }).parse(content), { fragment: true })
			);
		};
	}
</script>

<header>
	{#if editable}
		<ul class="inline-actions is-visible-on-hover">
			<li>
				<ContainerSettingsDropdown bind:container bind:parentContainer bind:relatedContainers />
			</li>
		</ul>
	{/if}
</header>

{#if editable && $ability.can('update', container)}
	<textarea bind:value={container.payload.body} />
{:else}
	<div {@attach appendHTML(container.payload.body)}></div>
{/if}

<style>
	textarea {
		font-family: monospace;
	}
</style>
