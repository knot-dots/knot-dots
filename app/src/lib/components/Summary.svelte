<script lang="ts">
	import { unified } from 'unified';
	import remarkParse from 'remark-parse';
	import remarkGfm from 'remark-gfm';
	import remarkRehype from 'remark-rehype';
	import rehypeSanitize from 'rehype-sanitize';
	import rehypeStringify from 'rehype-stringify';
	import stripMarkdown from 'strip-markdown';
	import rehypeExtractExcerpt from 'rehype-extract-excerpt';
	import type { Container, EmptyContainer } from '$lib/models';

	interface Props {
		container: Container | EmptyContainer;
		maxLength?: number;
	}

	let { container, maxLength = 200 }: Props = $props();
</script>

{#if 'summary' in container.payload && container.payload.summary}
	<p>{container.payload.summary}</p>
{:else if 'description' in container.payload && container.payload.description}
	{#await unified()
		.use(remarkParse)
		.use(remarkGfm)
		.use(stripMarkdown)
		.use(remarkRehype)
		.use(rehypeSanitize)
		.use(rehypeExtractExcerpt, { maxLength: maxLength, wordBoundaries: true })
		.use(rehypeStringify)
		.process(container.payload.description) then content}
		{#if content.data.excerpt}
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			<p>{@html content.data.excerpt}</p>
		{/if}
	{/await}
{/if}
