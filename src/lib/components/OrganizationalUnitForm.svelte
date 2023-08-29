<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import ContainerForm from '$lib/components/ContainerForm.svelte';
	import Editor from '$lib/components/Editor.svelte';
	import RelationSelector from '$lib/components/RelationSelector.svelte';
	import type {
		AnyContainer,
		EmptyOrganizationalUnitContainer,
		OrganizationalUnitContainer
	} from '$lib/models.js';
	import { isOrganizationalUnitContainer } from '$lib/models.js';

	export let container: OrganizationalUnitContainer | EmptyOrganizationalUnitContainer;
	export let isPartOfOptions: AnyContainer[];

	$: filterByLevel = ({ payload }: OrganizationalUnitContainer) =>
		container.payload.level === payload.level + 1;
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

	<svelte:fragment slot="meta">
		<RelationSelector
			{container}
			isPartOfOptions={isPartOfOptions.filter(isOrganizationalUnitContainer).filter(filterByLevel)}
		/>
	</svelte:fragment>

	<slot slot="extra-buttons">
		<slot name="extra-buttons" />
	</slot>
</ContainerForm>
