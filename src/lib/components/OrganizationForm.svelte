<script lang="ts">
	import { Icon, Trash } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import Editor from '$lib/components/Editor.svelte';
	import ListBox from '$lib/components/ListBox.svelte';
	import { organizationCategories } from '$lib/models.js';
	import type { EmptyOrganizationContainer, OrganizationContainer } from '$lib/models.js';

	export let container: OrganizationContainer | EmptyOrganizationContainer;

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
			<Icon src={Trash} size="20" />
		</button>
	</span>
{:else}
	<label>
		{$_('logo')}
		<input type="file" name="image" accept="image/png,image/jpeg" />
		<span class="help">{$_('upload.image.help')}</span>
	</label>
{/if}

<Editor label={$_('description')} bind:value={container.payload.description} />

<label>
	{$_('organization_category.label')}
	<select name="organizationCategory" bind:value={container.payload.organizationCategory}>
		{#each organizationCategories.options as organizationCategoryOption}
			<option value={organizationCategoryOption}>{$_(organizationCategoryOption)}</option>
		{/each}
	</select>
</label>

<ListBox
	label={$_('boards')}
	options={['board.internal_objectives', 'board.organizational_units', 'board.tasks']}
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
