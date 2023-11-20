<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Editor from '$lib/components/Editor.svelte';
	import ListBox from '$lib/components/ListBox.svelte';
	import RelationSelector from '$lib/components/RelationSelector.svelte';
	import type {
		AnyContainer,
		EmptyOrganizationalUnitContainer,
		OrganizationalUnitContainer
	} from '$lib/models';
	import { isOrganizationalUnitContainer } from '$lib/models';
	import { applicationState } from '$lib/stores';

	export let container: OrganizationalUnitContainer | EmptyOrganizationalUnitContainer;
	export let isPartOfOptions: AnyContainer[];

	applicationState.update((state) => ({
		...state,
		containerForm: { tabs: [] }
	}));

	$: filterByLevel = ({ payload }: OrganizationalUnitContainer) =>
		container.payload.level === payload.level + 1;
</script>

<label>
	{$_('logo')}
	<input type="file" name="image" accept="image/png,image/jpeg" />
	{#if 'image' in container.payload}
		<img alt={$_('image')} src={container.payload.image} />
	{/if}
	<span class="help">{$_('upload.image.help')}</span>
</label>

<Editor label={$_('description')} bind:value={container.payload.description} />

<RelationSelector
	{container}
	isPartOfOptions={isPartOfOptions.filter(isOrganizationalUnitContainer).filter(filterByLevel)}
/>

<ListBox
	label={$_('boards')}
	options={['board.indicators', 'board.internal_objectives', 'board.tasks']}
	bind:value={container.payload.boards}
/>
