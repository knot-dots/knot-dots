<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ListType from '~icons/knotdots/tasks';
	import Dropdown from '$lib/components/Dropdown.svelte';
	import {
		listTypes,
		isTeaserCollectionContainer,
		type Container,
		type AnyPayload
	} from '$lib/models';
	import { ability } from '$lib/stores';

	interface Props {
		container: Container<AnyPayload>;
	}

	let { container = $bindable() }: Props = $props();
</script>

{#if $ability.can('update', container, 'visibility') && isTeaserCollectionContainer(container)}
	<Dropdown --dropdown-panel-border-radius="16px" label={$_('settings')} offset={[0, 4]}>
		{#snippet button(popover)}
			<button class="dropdown-button" use:popover.button>
				<ListType />
			</button>
		{/snippet}

		{#snippet panel()}
			<fieldset class="listbox">
				{#each listTypes.options.map( (o) => ({ value: o, label: $_(`list_type.${o}`) }) ) as option (option.value)}
					<label>
						<input type="radio" value={option.value} bind:group={container.payload.listType} />
						<span class="truncated">{option.label}</span>
					</label>
				{/each}
			</fieldset>
		{/snippet}
	</Dropdown>
{/if}
