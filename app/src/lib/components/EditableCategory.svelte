<script lang="ts">
	import { _ } from 'svelte-i18n';
	import requestSubmit from '$lib/client/requestSubmit';
	import CategoryDropdown from '$lib/components/CategoryDropdown.svelte';
	import type { SustainableDevelopmentGoal } from '$lib/models';

	export let editable = false;
	export let value: SustainableDevelopmentGoal[];
</script>

<div class="label">{$_('category')}</div>
<CategoryDropdown {editable} handleChange={requestSubmit} bind:value />
