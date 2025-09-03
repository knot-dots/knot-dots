<script lang="ts">
	import { _ } from 'svelte-i18n';
	import TopicDropdown from '$lib/components/TopicDropdown.svelte';

	interface Props {
		editable?: boolean;
		value: string[];
	}

	let { editable = false, value = $bindable() }: Props = $props();
</script>

<div class="label">{$_('topic')}</div>
<TopicDropdown {editable} bind:value />
