<script lang="ts">
	import { onMount } from 'svelte';
	import { overrideItemIdKeyNameBeforeInitialisingDndZones } from 'svelte-dnd-action';
	import { _ } from 'svelte-i18n';
	import SignupDialog from '$lib/components/SignupDialog.svelte';
	import '../app.css';
	import type { LayoutData } from './$types';

	export let data: LayoutData;

	let dialog: HTMLDialogElement;

	overrideItemIdKeyNameBeforeInitialisingDndZones('guid');

	onMount(() => {
		if (data.user) {
			dialog.showModal();
		}
	});
</script>

<svelte:head>
	<title>{$_('page_title')}</title>
</svelte:head>

<slot />

<SignupDialog bind:dialog />
