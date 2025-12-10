<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Search from '~icons/knotdots/search';

	interface Props {
		value: string;
	}

	let { value = $bindable() }: Props = $props();

	function init(element: HTMLInputElement) {
		element.size = (element.getAttribute('placeholder')?.length ?? 6) + 2;
	}
</script>

<label class="focus-indicator">
	<Search />
	<span class="is-visually-hidden">{$_('search')}</span>
	<input name="search" placeholder={$_('search')} type="search" bind:value use:init />
</label>

<style>
	label {
		align-items: center;
		border-radius: 6px;
		display: flex;
		padding-left: 0.5rem;
	}

	input {
		background-color: transparent;
		border: none;
		display: inline-block;
		flex-grow: 0;
		height: 2rem;
		padding: 0 0.5rem;
	}

	input:focus {
		outline: none;
	}

	@container (min-width: 768px) {
		input:focus {
			width: 16rem;
		}
	}
</style>
