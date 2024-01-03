<script lang="ts">
	import {
		ChevronLeft,
		DocumentText,
		Eye,
		Icon,
		InformationCircle,
		Pencil
	} from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
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
			<SidebarTab href="/about" iconSource={InformationCircle} text={$_('about')} />
			<SidebarTab href="/imprint" iconSource={DocumentText} text={$_('imprint')} />
			<SidebarTab href="/privacy" iconSource={Eye} text={$_('privacy')} />
		</svelte:fragment>
	</Sidebar>

	<svelte:fragment slot="main">
		<div class="detail-page-content">
			<header class="content-header">
				<h2 class="with-icons">
					{data.container.payload.title}
					<span class="icons">
						{#if $ability.can('update', data.container)}
							<a href="/page/{data.container.guid}/edit" class="icons-element">
								<Icon solid src={Pencil} size="20" />
							</a>
						{/if}
						<button class="icons-element" type="button" on:click={() => window.history.back()}>
							<Icon solid src={ChevronLeft} size="20" />
						</button>
					</span>
				</h2>
			</header>
			<div class="content-details masked-overflow">
				<PageDetailView container={data.container} />
			</div>
		</div>
	</svelte:fragment>
</Layout>
