<script lang="ts">
	import remarkParse from 'remark-parse';
	import remarkGfm from 'remark-gfm';
	import remarkRehype from 'remark-rehype';
	import rehypeSanitize from 'rehype-sanitize';
	import rehypeStringify from 'rehype-stringify';
	import { _ } from 'svelte-i18n';
	import { unified } from 'unified';

	export let value = '';
</script>

{#await unified()
	.use(remarkParse)
	.use(remarkGfm)
	.use(remarkRehype)
	.use(rehypeSanitize)
	.use(rehypeStringify)
	.process(value) then content}
	<div class="markdown-body">
		{#if content.value}
			{@html content.value}
		{:else}
			{$_('empty')}
		{/if}
	</div>
{/await}
