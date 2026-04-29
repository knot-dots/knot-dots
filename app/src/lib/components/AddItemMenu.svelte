<script lang="ts">
	import { createMenu } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import CirclePlus from '~icons/flowbite/circle-plus-solid';
	import tooltip from '$lib/attachments/tooltip';
	import { mayCreateContainer } from '$lib/stores';
	import type { PayloadType } from '$lib/models';

	interface Props {
		managedBy: string;
		onchange: (event: Event) => void;
		options: {
			label: string;
			type: PayloadType;
			value: string;
		}[];
	}

	let { onchange, options, managedBy }: Props = $props();

	const menu = createMenu({ label: $_('add_item') });

	const [popperRef, popperContent] = createPopperActions({
		placement: 'left',
		strategy: 'absolute'
	});

	let extraOpts = $derived({
		modifiers: [{ name: 'offset', options: { offset: [0, -140] } }]
	});
</script>

<button
	{@attach tooltip($_('add_item'))}
	class="card"
	{onchange}
	type="button"
	use:menu.button
	use:popperRef
>
	<CirclePlus />
</button>

{#if $menu.expanded}
	<div class="dropdown-panel" use:menu.items use:popperContent={extraOpts}>
		<ul class="menu">
			{#each options as option (option.value)}
				{#if $mayCreateContainer(option.type, managedBy)}
					<li class="menu-item">
						<button
							use:menu.item={{
								value: option.value
							}}
							type="button"
						>
							{option.label}
						</button>
					</li>
				{/if}
			{/each}
		</ul>
	</div>
{/if}

<style>
	.card {
		align-items: center;
		background: #ffffff;
		border: 1px solid var(--color-gray-200);
		border-radius: 8px;
		box-shadow: var(--shadow-sm);
		cursor: pointer;
		height: var(--height, auto);
		min-height: 6rem;
		justify-content: center;
		width: 100%;
	}

	.card :global(svg) {
		height: 2.25rem;
		width: 2.25rem;
	}

	@container style(--card-style: carousel) {
		.card {
			align-items: center;
			cursor: pointer;
			display: grid;
			grid-row: 1 / 4;
			min-height: 6rem;
		}
	}
</style>
