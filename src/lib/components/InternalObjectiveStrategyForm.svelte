<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import Editor from '$lib/components/Editor.svelte';
	import ListBox from '$lib/components/ListBox.svelte';
	import OrganizationSelector from '$lib/components/OrganizationSelector.svelte';
	import { audience } from '$lib/models';
	import type {
		EmptyInternalStrategyContainer,
		InternalStrategyContainer,
		PartialRelation
	} from '$lib/models';
	import { applicationState } from '$lib/stores';

	export let container: InternalStrategyContainer | EmptyInternalStrategyContainer;

	applicationState.update((state) => ({
		...state,
		containerForm: { tabs: [] }
	}));

	$: if (container.relation.length == 0) {
		container.relation = paramsFromURL($page.url)
			.getAll('is-part-of-measure')
			.map(
				(o): PartialRelation => ({
					object: Number(o),
					position: 0,
					predicate: 'is-part-of-measure'
				})
			);
	}
</script>

<OrganizationSelector bind:container />

<ListBox
	label={$_('audience')}
	options={audience.options}
	bind:value={container.payload.audience}
/>

<legend>{$_('form.basic_data')}</legend>

<label>
	{$_('summary')}
	<textarea name="summary" maxlength="200" bind:value={container.payload.summary} />
</label>

{#key 'guid' in container ? container.guid : ''}
	<Editor label={$_('description')} bind:value={container.payload.description} />
{/key}
