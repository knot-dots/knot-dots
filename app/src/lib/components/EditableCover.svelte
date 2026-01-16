<script lang="ts">
	import UppyImageUploader from '$lib/components/UppyImageUploader.svelte';

	interface Props {
		editable?: boolean;
		label: string;
		value: string | undefined;
	}

	let { editable = false, label, value = $bindable() }: Props = $props();

	function onSuccess() {
		const form =
			document.querySelector(`[for="${id}"]`)?.closest('form') ||
			document.querySelector(`label`)?.closest('form');
		if (form) {
			form.requestSubmit();
		}
	}

	const id = crypto.randomUUID();
</script>

{#if editable}
	<UppyImageUploader
		bind:value
		{label}
		aspectRatio={16 / 9}
		class="action-button"
		mode="button"
		{onSuccess}
	/>
{/if}
