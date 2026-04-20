<script lang="ts">
	import { getContext } from 'svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { paramsFromFragment } from '$lib/models';
	import InlineFilterDropDown from '$lib/components/InlineFilterDropDown.svelte';

	type OptionWithSub = {
		count?: number;
		value: string;
		label: string;
		guid?: string;
		icon?: string;
		subOptions?: OptionWithSub[];
	};

	interface Props {
		initialValue?: string[];
		key: string;
		label?: string;
		options: OptionWithSub[];
	}

	let { initialValue = [], key, label, options }: Props = $props();

	let overlay = getContext('overlay');

	const changeKey = $derived.by(() => `${key}Changed`);

	let selectedFromUrl = $derived.by(() => {
		if (overlay) {
			return initialValue.length == 0 || paramsFromFragment(page.url).has(changeKey)
				? paramsFromFragment(page.url).getAll(key)
				: initialValue;
		} else {
			return initialValue.length == 0 || page.url.searchParams.has(changeKey)
				? page.url.searchParams.getAll(key)
				: initialValue;
		}
	});

	function updateUrl(value: string[]) {
		if (overlay) {
			const query = new SvelteURLSearchParams(page.url.hash.substring(1));
			query.delete(key);
			if (initialValue.length > 0) {
				query.set(changeKey, '');
			}
			value.forEach((s) => query.append(key, s));
			goto(`#${query.toString()}`, { keepFocus: true });
		} else {
			const query = new SvelteURLSearchParams(page.url.searchParams);
			query.delete(key);
			if (initialValue.length > 0) {
				query.set(changeKey, '');
			}
			value.forEach((s) => query.append(key, s));
			goto(`?${query.toString()}${page.url.hash}`, { keepFocus: true });
		}
	}
</script>

<InlineFilterDropDown
	{key}
	{label}
	mode="select"
	{options}
	bind:value={() => selectedFromUrl, (v) => updateUrl(v)}
/>
