<script lang="ts">
	import { createPopover } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import ChevronDown from '~icons/heroicons/chevron-down-16-solid';
	import ChevronUp from '~icons/heroicons/chevron-up-16-solid';
	import { type BackgroundColor, backgroundColor } from '$lib/models';
	import { backgroundColors } from '$lib/theme/models';
	import Background from '~icons/knotdots/background';

	interface Props {
		buttonStyle?: 'button' | 'default';
		editable?: boolean;
		offset?: [number, number];
		label: string;
		value?: BackgroundColor;
	}

	let {
		buttonStyle = 'default',
		editable = false,
		label,
		offset = [0, 4],
		value = $bindable()
	}: Props = $props();

	const popover = createPopover();

	const [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-start',
		strategy: 'absolute'
	});

	const extraOpts = { modifiers: [{ name: 'offset', options: { offset } }] };
</script>

{#if editable}
	<span class="dropdown" use:popperRef>
		<label class="button action-button" use:popover.button>
			{#if buttonStyle === 'button'}
				<Background /> {label}
			{:else}
				<Background />
				{label}
				{#if $popover.expanded}
					<ChevronUp />
				{:else}
					<ChevronDown />
				{/if}
			{/if}
		</label>
		{#if $popover.expanded}
			<fieldset class="dropdown-panel" use:popperContent={extraOpts} use:popover.panel>
				{#each backgroundColor.options.map( (o) => ({ label: $_(o), value: o }) ) as option (option.value)}
					{@const BackgroundColor = backgroundColors.get(option.value)}
					<label>
						<input type="radio" name="color" value={option.value} bind:group={value} />
						<span class="stage stage--color stage--{backgroundColors.get(option.value)}">
							&nbsp;
						</span>
						{option.label}
					</label>
				{/each}
			</fieldset>
		{/if}
	</span>
{/if}
