<script lang="ts">
	import { _ } from 'svelte-i18n';
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

	function slugify(str: string) {
		return String(str)
			.normalize('NFKD') // split accented characters into their base characters and diacritical marks
			.replace(/[\u0300-\u036f]/g, '') // remove all the accents, which happen to be all in the \u03xx UNICODE block.
			.trim() // trim leading or trailing whitespace
			.toLowerCase() // convert to lowercase
			.replace(/[^a-z0-9 -]/g, '') // remove non-alphanumeric characters
			.replace(/\s+/g, '-') // replace spaces with hyphens
			.replace(/-+/g, '-'); // remove consecutive hyphens
	}

	$: container.payload.slug = slugify(container.payload.name ?? '');
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
