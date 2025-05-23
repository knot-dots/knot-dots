<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import ContainerForm from '$lib/components/ContainerForm.svelte';
	import Navigation from '$lib/components/Navigation.svelte';
	import { overlayKey, type PageContainer, paramsFromFragment } from '$lib/models';

	interface Props {
		container: PageContainer;
	}

	let { container }: Props = $props();

	let hashParams = $derived(paramsFromFragment(page.url));

	async function afterSubmit() {
		const newParams = new URLSearchParams(hashParams);
		newParams.delete('edit-help');
		await goto(`#${newParams.toString()}`, { invalidateAll: true });
	}

	function cancelURL() {
		const newParams = new URLSearchParams(hashParams);

		if (newParams.has(overlayKey.enum['edit-help'])) {
			newParams.delete(overlayKey.enum['edit-help']);
		} else {
			newParams.delete(overlayKey.enum.create);
			newParams.delete(overlayKey.enum.edit);
		}

		return `#${newParams.toString()}`;
	}
</script>

<Navigation sortOptions={[]} workspaceOptions={[]} />
<div class="content-details masked-overflow">
	<ContainerForm bind:container on:submitSuccessful={() => afterSubmit()} />
</div>
<footer class="content-footer">
	<div class="content-actions">
		<button class="primary" form="container-form" type="submit">{$_('save')}</button>
		<a class="button" href={cancelURL()}>{$_('cancel')}</a>
	</div>
</footer>
