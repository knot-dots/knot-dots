<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Maximize from '~icons/knotdots/maximize';
	import Minimize from '~icons/knotdots/minimize';

	export let enabled: boolean;
</script>

<li>
	<button class="button-nav button-square" on:click title={$_('full_screen')}>
		{#if enabled}<Minimize />{:else}<Maximize />{/if}
	</button>
</li>
