<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Trash from '~icons/heroicons/trash';
	import Editor from '$lib/components/Editor.svelte';
	import ListBox from '$lib/components/ListBox.svelte';
	import { organizationCategories } from '$lib/models';
	import type { EmptyOrganizationContainer, OrganizationContainer } from '$lib/models';
	import { applicationState } from '$lib/stores';

	export let container: OrganizationContainer | EmptyOrganizationContainer;

	applicationState.update((state) => ({
		...state,
		containerForm: { tabs: [] }
	}));

	function removeImage() {
		delete container.payload.image;
		container.payload = container.payload;
	}
</script>

{#if 'image' in container.payload}
	<span class="preview">
		<img alt={$_('image')} class="logo" src={container.payload.image} />
		<button
			class="quiet remove"
			title={$_('remove_image')}
			type="button"
			on:click|stopPropagation={removeImage}
		>
			<Trash />
		</button>
	</span>
{:else}
	<label>
		{$_('logo')}
		<input type="file" name="image" accept="image/png,image/jpeg" />
		<span class="help">{$_('upload.image.help')}</span>
	</label>
{/if}

{#key 'guid' in container ? container.guid : ''}
	<Editor label={$_('description')} bind:value={container.payload.description} />
{/key}

<ListBox
	label={$_('organization_category.label')}
	options={organizationCategories.options.map((o) => ({ value: o, label: $_(o) }))}
	bind:value={container.payload.organizationCategory}
/>

<ListBox
	label={$_('boards')}
	options={['board.indicators', 'board.organizational_units'].map((o) => ({
		value: o,
		label: $_(o)
	}))}
	bind:value={container.payload.boards}
/>

<style>
	.preview {
		align-items: center;
		display: flex;
		gap: 0.5rem;
	}

	.remove {
		color: var(--color-red-500);
	}
</style>
