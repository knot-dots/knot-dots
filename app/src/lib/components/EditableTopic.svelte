<script lang="ts">
	import { _ } from 'svelte-i18n';
	import requestSubmit from '$lib/client/requestSubmit';
	import TopicDropdown from '$lib/components/TopicDropdown.svelte';

	export let editable = false;
	export let value: string[];
</script>

<div class="tabular">
	<span class="label">{$_('topic')}</span>
	<div class="value">
		<TopicDropdown {editable} handleChange={requestSubmit} bind:value />
	</div>
</div>
