<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { createPopover } from 'svelte-headlessui';
	import { createPopperActions } from 'svelte-popperjs';
	import Ellipsis from '~icons/knotdots/ellipsis';
	import TrashBin from '~icons/flowbite/trash-bin-outline';

	interface Props {
		disabled?: boolean;
		onRemove: () => void | Promise<void>;
	}

	let { disabled = false, onRemove }: Props = $props();

	let popover = createPopover({ label: $_('settings') });

	let [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-end',
		strategy: 'absolute'
	});

	const extraOpts = { modifiers: [{ name: 'offset', options: { offset: [0, 4] } }] };
</script>

<ul class="inline-actions is-visible-on-hover">
	<li class="dropdown" use:popperRef>
		<button class="dropdown-button" {disabled} type="button" use:popover.button>
			<Ellipsis />
		</button>

		{#if $popover.expanded}
			<fieldset class="dropdown-panel" use:popperContent={extraOpts} use:popover.panel>
				<button
					class="action-button action-button--padding-tight"
					type="button"
					onclick={() => {
						popover.close();
						void onRemove();
					}}
					{disabled}
				>
					<TrashBin />
					<span>{$_('category.terms.remove_button')}</span>
				</button>
			</fieldset>
		{/if}
	</li>
</ul>

<style>
	.dropdown-panel {
		border-radius: 16px;
	}

	.dropdown-panel .action-button {
		color: var(--color-red-500);
		display: flex;
		font-size: 0.875rem;
		font-weight: 500;
		gap: 0.25rem;
		padding: 0.5rem 0.75rem;
		width: 100%;
	}

	.dropdown-panel .action-button :global(svg) {
		max-width: revert;
	}

	.dropdown-panel .action-button span {
		color: var(--color-gray-500);
	}
</style>
