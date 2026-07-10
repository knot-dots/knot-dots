<script lang="ts">
	import { _ } from 'svelte-i18n';
	import EditableSingleChoice from '$lib/components/EditableSingleChoice.svelte';
	import { type AnyPayload, type Container } from '$lib/models';
	import visibilityOptions from '$lib/visibilityOptions.svelte';

	interface Props {
		container: Container<AnyPayload>;
		editable?: boolean;
		relatedContainers?: Container<AnyPayload>[];
	}

	let { container = $bindable(), editable = false, relatedContainers = [] }: Props = $props();
</script>

<EditableSingleChoice
	{editable}
	label={$_('visibility.label')}
	options={visibilityOptions(container, relatedContainers)}
	bind:value={container.payload.visibility}
/>
