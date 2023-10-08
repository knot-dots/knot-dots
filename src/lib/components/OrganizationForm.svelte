<script lang="ts">
	import { Icon, Trash } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import ContainerForm from '$lib/components/ContainerForm.svelte';
	import Editor from '$lib/components/Editor.svelte';
	import { organizationCategories } from '$lib/models.js';
	import type { EmptyOrganizationContainer, OrganizationContainer } from '$lib/models.js';

	export let container: OrganizationContainer | EmptyOrganizationContainer;

	function removeImage() {
		delete container.payload.image;
		container.payload = container.payload;
	}
</script>

<ContainerForm {container} on:submitSuccessful on:deleteSuccessful>
	<svelte:fragment slot="data">
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
				<input type="file" name="upload" accept="image/png,image/jpeg" />
				<span class="help">{$_('image_upload_help')}</span>
			</label>
		{/if}
		<Editor label={$_('description')} bind:value={container.payload.description} />
	</svelte:fragment>

	<svelte:fragment slot="meta">
		<label>
			{$_('organization_category.label')}
			<select name="organizationCategory" bind:value={container.payload.organizationCategory}>
				{#each organizationCategories.options as organizationCategoryOption}
					<option value={organizationCategoryOption}>{$_(organizationCategoryOption)}</option>
				{/each}
			</select>
		</label>
	</svelte:fragment>

	<slot slot="extra-buttons">
		<slot name="extra-buttons" />
	</slot>
</ContainerForm>

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
