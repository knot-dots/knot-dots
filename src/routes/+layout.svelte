<script lang="ts">
	import { overrideItemIdKeyNameBeforeInitialisingDndZones } from 'svelte-dnd-action';
	import { _ } from 'svelte-i18n';
	import '../app.css';

	overrideItemIdKeyNameBeforeInitialisingDndZones('guid');
</script>

<svelte:head>
	<title>{$_('page_title')}</title>
</svelte:head>

<slot />
