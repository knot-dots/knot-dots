<script lang="ts">
	import { _ } from 'svelte-i18n';
	import TopicDropdown from '$lib/components/TopicDropdown.svelte';

	export let editable = false;
	export let value: string[];
</script>

<div class="label">{$_('topic')}</div>
<TopicDropdown {editable} bind:value />
