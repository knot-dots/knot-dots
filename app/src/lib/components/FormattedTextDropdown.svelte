<script lang="ts">
	import rehypeExtractExcerpt from 'rehype-extract-excerpt';
	import rehypeSanitize from 'rehype-sanitize';
	import rehypeStringify from 'rehype-stringify';
	import remarkGfm from 'remark-gfm';
	import remarkParse from 'remark-parse';
	import remarkRehype from 'remark-rehype';
	import stripMarkdown from 'strip-markdown';
	import { _ } from 'svelte-i18n';
	import { unified } from 'unified';
	import { page } from '$app/state';
	import Dropdown from '$lib/components/Dropdown.svelte';
	import Editor from '$lib/components/Editor.svelte';
	import Viewer from '$lib/components/Viewer.svelte';
	import rehypeReplace from '$lib/unified/rehype-replace';

	interface Props {
		editable?: boolean;
		offset?: [number, number];
		value: string | undefined;
	}

	let { editable = false, offset = [-24, -39], value = $bindable() }: Props = $props();
</script>

<Dropdown
	--dropdown-panel-max-height="20rem"
	--dropdown-panel-padding="0.75rem 1rem"
	--dropdown-panel-width="min(80vw, 44rem)"
	{offset}
>
	{#snippet button(popover)}
		{#await unified()
			.use(remarkParse)
			.use(remarkGfm)
			.use(stripMarkdown)
			.use(remarkRehype)
			.use(rehypeSanitize)
			.use(rehypeExtractExcerpt, { maxLength: 200 })
			.use(rehypeReplace, { context: page.data })
			.use(rehypeStringify)
			.process(value) then content}
			<button class="dropdown-button truncated" type="button" use:popover.button>
				{#if content.data.excerpt}
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html content.data.excerpt}
				{:else}
					{$_('empty')}
				{/if}
			</button>
		{/await}
	{/snippet}

	{#snippet panel()}
		{#if editable}
			<Editor bind:value />
		{:else}
			<Viewer {value} />
		{/if}
	{/snippet}
</Dropdown>

<style>
	.dropdown-button {
		display: block;
		text-align: left;
	}
</style>
