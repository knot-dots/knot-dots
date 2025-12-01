<script lang="ts">
	import { _ } from 'svelte-i18n';
	import GoalStatusDropdown from '$lib/components/GoalStatusDropdown.svelte';
	import type { GoalStatus } from '$lib/models';

	interface Props {
		editable?: boolean;
		value: GoalStatus;
	}

	let { editable = false, value = $bindable() }: Props = $props();
</script>

<div class="label">{$_('goal_status')}</div>
<GoalStatusDropdown {editable} bind:value />
