<script lang="ts">
	import remarkParse from 'remark-parse';
	import remarkGfm from 'remark-gfm';
	import remarkRehype from 'remark-rehype';
	import rehypeSanitize from 'rehype-sanitize';
	import rehypeStringify from 'rehype-stringify';
	import { unified } from 'unified';
	import { page } from '$app/state';
	import rehypeReplace from '$lib/unified/rehype-replace';

	interface Props {
		value?: string;
	}

	let { value = '' }: Props = $props();

	let content = $derived(
		unified()
			.use(remarkParse)
			.use(remarkGfm)
			.use(remarkRehype)
			.use(rehypeSanitize)
			.use(rehypeReplace, { context: page.data })
			.use(rehypeStringify)
			.processSync(value)
	);
</script>

<div class="markdown-body">
	{#if content.value}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html content.value}
	{/if}
</div>
