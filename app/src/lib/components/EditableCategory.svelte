<script lang="ts">
	import { _ } from 'svelte-i18n';
	import CategoryDropdown from '$lib/components/CategoryDropdown.svelte';
	import type { SustainableDevelopmentGoal } from '$lib/models';

	interface Props {
		editable?: boolean;
		value: SustainableDevelopmentGoal[];
	}

	let { editable = false, value = $bindable() }: Props = $props();
</script>

<div class="label">{$_('category')}</div>
<CategoryDropdown {editable} bind:value />
