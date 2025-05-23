<script lang="ts">
	import Navigation from '$lib/components/Navigation.svelte';
	import PageDetailView from '$lib/components/PageDetailView.svelte';
	import { type PageContainer } from '$lib/models';

	interface Props {
		container: PageContainer;
	}

	let { container }: Props = $props();
</script>

<Navigation sortOptions={[]} workspaceOptions={[]} />
<div class="content-details masked-overflow">
	<PageDetailView {container} />
</div>
<footer class="content-footer">
	<div class="content-actions"></div>
</footer>
