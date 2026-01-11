<script lang="ts">
	import { _ } from 'svelte-i18n';
	import RuleStatusDropdown from '$lib/components/RuleStatusDropdown.svelte';
	import type { RuleStatus } from '$lib/models';

	interface Props {
		editable?: boolean;
		value: RuleStatus;
	}

	let { editable = false, value = $bindable() }: Props = $props();

	const id = crypto.randomUUID();
</script>

<div class="label" {id}>{$_('rule_status')}</div>
<RuleStatusDropdown {editable} labelledBy={id} bind:value />
