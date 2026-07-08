<script lang="ts">
	import type { Snippet } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { setBulkActionContext } from '$lib/contexts/bulkAction';

	interface Props {
		actions: string[];
		children?: Snippet;
	}

	let { actions, children }: Props = $props();

	setBulkActionContext({
		actions,
		cascadingDelete: true,
		selected: new SvelteSet<string>()
	});
</script>

{@render children?.()}
