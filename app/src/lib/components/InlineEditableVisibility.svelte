<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Eye from '~icons/flowbite/eye-outline';
	import tooltip from '$lib/attachments/tooltip';
	import SingleChoiceDropdown from '$lib/components/SingleChoiceDropdown.svelte';
	import { type AnyPayload, type Container } from '$lib/models';
	import visibilityOptions from '$lib/visibilityOptions.svelte';

	interface Props {
		container: Container<AnyPayload>;
		editable?: boolean;
		relatedContainers?: Container<AnyPayload>[];
	}

	let { container = $bindable(), editable = false, relatedContainers = [] }: Props = $props();

	const options = $derived(visibilityOptions(container, relatedContainers));

	const selected = $derived(
		options.find((option) => option.value === container.payload.visibility)
	);
</script>

{#if editable}
	<SingleChoiceDropdown
		options={visibilityOptions(container, relatedContainers)}
		bind:value={container.payload.visibility}
	>
		{#snippet button(popover)}
			<button
				{@attach tooltip($_('visibility.label'))}
				class="dropdown-button"
				type="button"
				use:popover.button
			>
				<span class="badge badge--large">
					<Eye />
					<span class="truncated">{selected?.label ?? $_('empty')}</span>
				</span>
			</button>
		{/snippet}
	</SingleChoiceDropdown>
{:else}
	<span class="badge badge--large badge--gray">
		<span class="truncated">{selected?.label ?? $_('empty')}</span>
	</span>
{/if}
