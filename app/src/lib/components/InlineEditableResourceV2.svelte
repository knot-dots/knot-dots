<script lang="ts">
	import { resource } from 'runed';
	import type { createPopover } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import tooltip from '$lib/attachments/tooltip';
	import fetchContainers from '$lib/client/fetchContainers';
	import SingleChoiceDropdown from '$lib/components/SingleChoiceDropdown.svelte';
	import { type Container, payloadTypes, type ResourceV2Payload } from '$lib/models';

	interface Props {
		editable?: boolean;
		value: string;
	}

	let { editable = false, value = $bindable() }: Props = $props();

	const resourceQuery = resource([], async (_, __, { signal }) => {
		return (await fetchContainers({ payloadType: [payloadTypes.enum.resource_v2] }, 'alpha', {
			signal
		})) as Container<ResourceV2Payload>[];
	});

	const options = $derived(
		(resourceQuery.current ?? []).map((r) => ({
			label: `${r.payload.title} (in ${$_(r.payload.resourceUnit)})`,
			value: r.guid
		}))
	);

	const selected = $derived(options.find((o) => o.value === value));
</script>

{#if editable}
	<SingleChoiceDropdown {options} bind:value>
		{#snippet button(popover: ReturnType<typeof createPopover>)}
			<button
				{@attach tooltip($_('resource'))}
				class="dropdown-button module-resource-planning"
				type="button"
				use:popover.button
			>
				<span class="badge badge--large">
					<span class="truncated">
						{#if selected}{selected.label}{:else}{$_('empty')}{/if}
					</span>
				</span>
			</button>
		{/snippet}
	</SingleChoiceDropdown>
{:else}
	<span class="badge badge--large module-resource-planning">
		{resourceQuery.current?.find((r) => r.guid === value)?.payload.title ?? $_('empty')}
	</span>
{/if}
