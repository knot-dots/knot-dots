<script lang="ts">
	import { unified } from 'unified';
	import remarkParse from 'remark-parse';
	import remarkRehype from 'remark-rehype';
	import rehypeSanitize from 'rehype-sanitize';
	import rehypeStringify from 'rehype-stringify';
	import stripMarkdown from 'strip-markdown';
	import rehypeExtractExcerpt from 'rehype-extract-excerpt';
	import type { VFile } from 'vfile';
	import { page } from '$app/state';
	import type { Container, EmptyContainer } from '$lib/models';
	import rehypeReplace from '$lib/unified/rehype-replace';

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
		.use(stripMarkdown)
		.use(remarkRehype)
		.use(rehypeSanitize)
		.use(rehypeExtractExcerpt, { maxLength: maxLength, wordBoundaries: true })
		.use(rehypeReplace, { context: page.data })
		.use(rehypeStringify)
		.process(container.payload.description as string) then content}
		{#if (content as VFile).data.excerpt}
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			<p>{@html (content as VFile).data.excerpt}</p>
		{/if}
	{/await}
{/if}
