<script lang="ts">
	import { _ } from 'svelte-i18n';
	import RuleStatusDropdown from '$lib/components/RuleStatusDropdown.svelte';
	import type { RuleStatus } from '$lib/models';

	interface Props {
		editable?: boolean;
		value: RuleStatus;
	}

	let { editable = false, value = $bindable() }: Props = $props();
</script>

<div class="label">{$_('rule_status')}</div>
<RuleStatusDropdown {editable} bind:value />
