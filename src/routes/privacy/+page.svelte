<script lang="ts">
	import { _ } from 'svelte-i18n';
	import DocumentText from '~icons/heroicons/document-text-20-solid';
	import Eye from '~icons/heroicons/eye-20-solid';
	import Pencil from '~icons/heroicons/pencil-solid';
	import Info from '~icons/knotdots/info';
	import Layout from '$lib/components/Layout.svelte';
	import PageDetailView from '$lib/components/PageDetailView.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import SidebarTab from '$lib/components/SidebarTab.svelte';
	import { ability } from '$lib/stores';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<Layout>
	<Sidebar slot="sidebar">
		<svelte:fragment slot="tabs">
			<SidebarTab href="/about" iconSource={Info} text={$_('about')} />
			<SidebarTab href="/imprint" iconSource={DocumentText} text={$_('imprint')} />
			<SidebarTab href="/privacy" iconSource={Eye} text={$_('privacy')} />
		</svelte:fragment>
	</Sidebar>

	<svelte:fragment slot="main">
		<div class="detail-page-content">
			<header class="content-header">
				<h2>
					{data.container.payload.title}
					{#if $ability.can('update', data.container)}
						<a href="/page/{data.container.guid}/edit" class="button button-square quiet">
							<Pencil />
						</a>
					{/if}
				</h2>
			</header>
			<div class="content-details masked-overflow">
				<PageDetailView container={data.container} />
			</div>
		</div>
	</svelte:fragment>
</Layout>
