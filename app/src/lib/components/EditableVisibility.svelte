<script lang="ts">
	import { _ } from 'svelte-i18n';
	import EditableSingleChoice from '$lib/components/EditableSingleChoice.svelte';
	import { type AnyContainer } from '$lib/models';
	import visibilityOptions from '$lib/visibilityOptions.svelte';

	interface Props {
		container: AnyContainer;
		editable?: boolean;
		relatedContainers?: AnyContainer[];
	}

	let { container = $bindable(), editable = false, relatedContainers = [] }: Props = $props();
</script>

<EditableSingleChoice
	{editable}
	label={$_('visibility.label')}
	options={visibilityOptions(container, relatedContainers)}
	bind:value={container.payload.visibility}
/>
