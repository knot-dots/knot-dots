<script lang="ts">
	import { _ } from 'svelte-i18n';
	import GoalStatusDropdown from '$lib/components/GoalStatusDropdown.svelte';
	import type { GoalStatus } from '$lib/models';

	export let editable = false;
	export let value: GoalStatus;
</script>

<div class="label">{$_('goal_status')}</div>
<GoalStatusDropdown {editable} bind:value />
