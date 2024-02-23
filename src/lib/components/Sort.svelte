<script lang="ts">
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	export let options = [
		[$_('sort_modified'), 'modified'],
		[$_('sort_alphabetically'), 'alpha']
	];

	let overlay = getContext('overlay');
	let selected = $page.url.searchParams.get('sort') ?? 'alpha';

	function apply() {
		if (overlay) {
			const query = new URLSearchParams($page.url.hash.substring(1));
			query.delete('sort');
			if (selected != 'alpha') {
				query.append('sort', selected);
			}
			goto(`#${query.toString()}`, { keepFocus: true });
		} else {
			const query = new URLSearchParams($page.url.searchParams);
			query.delete('sort');
			if (selected != 'alpha') {
				query.append('sort', selected);
			}
			goto(`?${query.toString()}${$page.url.hash}`, { keepFocus: true });
		}
	}
</script>

{#each options as [label, value]}
	<li>
		<label>
			<input type="radio" {value} bind:group={selected} on:change={apply} />
			{label}
		</label>
	</li>
{/each}
