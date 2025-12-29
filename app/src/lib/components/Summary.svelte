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
		maxWords?: number;
	}

	let { container, maxWords }: Props = $props();

	function cropByWords(text: string, maxWords: number): string {
		const words = text.trim().split(/\s+/);
		if (words.length <= maxWords) {
			return text;
		}
		return words.slice(0, maxWords).join(' ') + '…';
	}
</script>

{#if 'summary' in container.payload && container.payload.summary}
	<p>{maxWords ? cropByWords(container.payload.summary, maxWords) : container.payload.summary}</p>
{:else if 'description' in container.payload && container.payload.description}
	{#await unified()
		.use(remarkParse)
		.use(remarkGfm)
		.use(stripMarkdown)
		.use(remarkRehype)
		.use(rehypeSanitize)
		.use(rehypeExtractExcerpt, { maxLength: 200 })
		.use(rehypeStringify)
		.process(container.payload.description) then content}
		{#if content.data.excerpt}
			{@const excerptText =
				typeof content.data.excerpt === 'string'
					? content.data.excerpt
					: String(content.data.excerpt)}
			<p>{@html maxWords ? cropByWords(excerptText, maxWords) : excerptText}</p>
		{/if}
	{/await}
{/if}
