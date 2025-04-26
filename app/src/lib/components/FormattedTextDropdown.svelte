<script lang="ts">
	import rehypeExtractExcerpt from 'rehype-extract-excerpt';
	import rehypeSanitize from 'rehype-sanitize';
	import rehypeStringify from 'rehype-stringify';
	import remarkGfm from 'remark-gfm';
	import remarkParse from 'remark-parse';
	import remarkRehype from 'remark-rehype';
	import stripMarkdown from 'strip-markdown';
	import { createPopover } from 'svelte-headlessui';
	import { createPopperActions } from 'svelte-popperjs';
	import { unified } from 'unified';
	import Editor from '$lib/components/Editor.svelte';
	import Viewer from '$lib/components/Viewer.svelte';

	interface Props {
		editable?: boolean;
		value: string;
	}

	let { editable = false, value = $bindable() }: Props = $props();

	const popover = createPopover();

	const [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-start',
		strategy: 'absolute'
	});

	const extraOpts = {
		modifiers: [{ name: 'offset', options: { offset: [-24, -39] } }]
	};
</script>

<div class="dropdown" use:popperRef>
	{#await unified()
		.use(remarkParse)
		.use(remarkGfm)
		.use(stripMarkdown)
		.use(remarkRehype)
		.use(rehypeSanitize)
		.use(rehypeExtractExcerpt, { maxLength: 200 })
		.use(rehypeStringify)
		.process(value) then content}
		{#if content.data.excerpt}
			<button class="dropdown-button truncated" type="button" use:popover.button>
				{@html content.data.excerpt}
			</button>
		{/if}
	{/await}
	{#if $popover.expanded}
		<div class="dropdown-panel" use:popperContent={extraOpts} use:popover.panel>
			{#if editable}
				<Editor bind:value />
			{:else}
				<Viewer {value} />
			{/if}
		</div>
	{/if}
</div>

<style>
	.dropdown-button {
		display: block;
		text-align: left;
	}

	.dropdown-panel {
		border: solid 1px var(--color-gray-300);
		border-radius: 0.5rem;
		overflow: visible;
		width: 50%;
	}

	.dropdown-panel > :global(*) {
		max-height: 20rem;
		overflow-x: hidden;
		overflow-y: auto;
		padding: 0.75rem 1rem;
	}
</style>
