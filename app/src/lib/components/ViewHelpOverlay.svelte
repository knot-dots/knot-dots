<script lang="ts">
	import Pencil from '~icons/heroicons/pencil-solid';
	import { page } from '$app/state';
	import PageDetailView from '$lib/components/PageDetailView.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { overlayKey, type PageContainer, paramsFromFragment } from '$lib/models';
	import { ability } from '$lib/stores';

	interface Props {
		container: PageContainer;
	}

	let { container }: Props = $props();

	let hashParams = $derived(paramsFromFragment(page.url));

	function editHelpURL() {
		const newParams = new URLSearchParams(hashParams);
		newParams.set(overlayKey.enum['edit-help'], '');
		return `#${newParams.toString()}`;
	}
</script>

<aside>
	<Sidebar>
		<svelte:fragment slot="tabs">
			{#if $ability.can('update', container)}
				<li>
					<a class="button button-nav button-square" href={editHelpURL()}>
						<Pencil />
					</a>
				</li>
			{/if}
		</svelte:fragment>
		<slot slot="extra" />
	</Sidebar>
</aside>
<div class="content-details masked-overflow">
	<PageDetailView {container} />
</div>
<footer class="content-footer">
	<div class="content-actions"></div>
</footer>
