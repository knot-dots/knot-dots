<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ContainerForm from '$lib/components/ContainerForm.svelte';
	import Editor from '$lib/components/Editor.svelte';
	import type { EmptyOrganizationContainer, OrganizationContainer } from '$lib/models.js';

	export let container: OrganizationContainer | EmptyOrganizationContainer;
</script>

<ContainerForm {container} on:submitSuccessful on:deleteSuccessful>
	<svelte:fragment slot="data">
		<label>
			{$_('logo')}
			<input type="file" name="upload" accept="image/png,image/jpeg" />
			{#if 'image' in container.payload}
				<img alt={$_('image')} src={container.payload.image} />
			{/if}
			<p class="help">{$_('image_upload_help')}</p>
		</label>
		<Editor label={$_('description')} bind:value={container.payload.description} />
	</svelte:fragment>

	<slot slot="extra-buttons">
		<slot name="extra-buttons" />
	</slot>
</ContainerForm>
