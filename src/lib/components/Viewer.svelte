<script lang="ts">
	import { unified } from 'unified';
	import remarkParse from 'remark-parse';
	import remarkGfm from 'remark-gfm';
	import remarkRehype from 'remark-rehype';
	import rehypeStringify from 'rehype-stringify';

	export let value = '';
</script>

{#await unified()
	.use(remarkParse)
	.use(remarkGfm)
	.use(remarkRehype)
	.use(rehypeStringify)
	.process(value) then content}
	<div class="markdown-body">
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html content}
	</div>
{/await}
