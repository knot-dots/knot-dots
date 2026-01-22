<script lang="ts">
	import { _ } from 'svelte-i18n';
	import TopicDropdown from '$lib/components/TopicDropdown.svelte';

	interface Props {
		editable?: boolean;
		value: string[];
	}

	let { editable = false, value = $bindable() }: Props = $props();

	const id = crypto.randomUUID();
</script>

<div class="label" {id}>{$_('topic')}</div>
<TopicDropdown {editable} labelledBy={id} bind:value />
