<script lang="ts">
	import remarkParse from 'remark-parse';
	import remarkGfm from 'remark-gfm';
	import remarkRehype from 'remark-rehype';
	import rehypeSanitize from 'rehype-sanitize';
	import rehypeStringify from 'rehype-stringify';
	import { _ } from 'svelte-i18n';
	import { unified } from 'unified';

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
			.use(rehypeStringify)
			.processSync(value)
	);
</script>

<div class="markdown-body">
	{#if content.value}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html content.value}
	{:else}
		{$_('empty')}
	{/if}
</div>
