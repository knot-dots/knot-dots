<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import Editor from '$lib/components/Editor.svelte';
	import type { EmptyPageContainer, PageContainer } from '$lib/models';
	import { applicationState } from '$lib/stores';

	export let container: PageContainer | EmptyPageContainer;

	applicationState.update((state) => ({
		...state,
		containerForm: {
			activeTab: 'basic-data',
			tabs: ['basic-data']
		}
	}));
</script>

<fieldset class="form-tab" id="basic-data">
	<legend>{$_('form.basic_data')}</legend>

	<label>
		{$_('slug')}
		<input name="slug" type="text" bind:value={container.payload.slug} readonly />
	</label>

	<Editor label={$_('body')} bind:value={container.payload.body} />
</fieldset>
