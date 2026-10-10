<script lang="ts">
	import { _ } from 'svelte-i18n';
	import UserIcon from '~icons/flowbite/user-solid';
	import tooltip from '$lib/attachments/tooltip';
	import MultipleChoiceDropdown from '$lib/components/MultipleChoiceDropdown.svelte';
	import { displayName, type User } from '$lib/models';

	interface Props {
		candidatesPromise: Promise<User[]>;
		editable: boolean;
		value: string[];
	}

	let { candidatesPromise, editable = false, value = $bindable() }: Props = $props();
</script>

{#await candidatesPromise}
	{#if editable}
		<MultipleChoiceDropdown options={[]} value={[]} />
	{:else}
		<span class="badge badge">{$_('empty')}</span>
	{/if}
{:then candidates}
	{const options = $derived(
		candidates
			.filter(({ family_name }) => family_name !== '')
			.map((m) => ({ value: m.guid, label: displayName(m) }))
	)}
	{const selected = $derived(options.filter((o) => value.includes(o.value)))}
	{#if editable}
		<MultipleChoiceDropdown bind:value {options}>
			{#snippet button(popover)}
				<button
					{@attach tooltip($_('assignee'))}
					class="dropdown-button dropdown-button--select module-implementation-planning"
					type="button"
					use:popover.button
				>
					{#each selected as selectedOption (selectedOption.value)}
						<span class="badge badge--large">
							<UserIcon />
							<span class="truncated">{selectedOption.label}</span>
						</span>
					{:else}
						<span class="badge badge--large">{$_('empty')}</span>
					{/each}
				</button>
			{/snippet}
		</MultipleChoiceDropdown>
	{:else}
		<ul {@attach tooltip($_('assignee'))} class="value module-implementation-planning">
			{#each selected as seletcedOption (seletcedOption.value)}
				<li class="badge badge--large">
					<UserIcon />
					<span class="truncated">{seletcedOption.label}</span>
				</li>
			{:else}
				<li class="badge badge--large">
					{$_('empty')}
				</li>
			{/each}
		</ul>
	{/if}
{/await}
