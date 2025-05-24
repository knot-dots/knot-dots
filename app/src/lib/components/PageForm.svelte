<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Editor from '$lib/components/Editor.svelte';
	import type { EmptyPageContainer, PageContainer } from '$lib/models';

	export let container: PageContainer | EmptyPageContainer;
</script>

<fieldset class="form-tab" id="basic-data">
	<label>
		{$_('slug')}
		<input name="slug" type="text" bind:value={container.payload.slug} readonly />
	</label>

	{#key 'guid' in container ? container.guid : ''}
		<Editor label={$_('body')} bind:value={container.payload.body} />
	{/key}
</fieldset>
