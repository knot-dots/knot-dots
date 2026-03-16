<script lang="ts">
	import { _ } from 'svelte-i18n';
	import MultipleChoiceDropdown from '$lib/components/MultipleChoiceDropdown.svelte';
	import transformFileURL from '$lib/transformFileURL';

	interface Props {
		editable?: boolean;
		label: string;
		options?: Array<{
			label: string;
			value: string;
			guid?: string;
			icon?: string;
			subOptions?: Array<{ label: string; value: string; guid?: string; icon?: string }>;
		}>;
		value?: string[];
	}

	type Option = NonNullable<Props['options']>[number];
	type SubOption = NonNullable<Option['subOptions']>[number];
	type SafeSubOption = Omit<SubOption, 'guid'> & { guid: string };
	type SafeOption = Omit<Option, 'guid' | 'subOptions'> & {
		guid: string;
		subOptions?: SafeSubOption[];
	};

	let {
		editable = false,
		label,
		options = [],
		value = $bindable([] as string[])
	}: Props = $props();

	function iconURL(origin?: string) {
		if (!origin) return undefined;
		try {
			return transformFileURL(origin);
		} catch (error) {
			console.warn('Failed to transform icon URL', error);
			return origin;
		}
	}

	let safeOptions: SafeOption[] = $derived.by(() =>
		Array.isArray(options)
			? options.map((option) => ({
					...option,
					guid: option.guid ?? option.value,
					subOptions: option.subOptions?.map((sub) => ({
						...sub,
						guid: sub.guid ?? sub.value
					}))
				}))
			: []
	);

	const id = crypto.randomUUID();

	let selectedEntries = $derived.by(() => {
		if (!Array.isArray(value)) return [];
		const entries: Array<{
			option: SafeOption | SafeSubOption;
			isChild: boolean;
		}> = [];
		const groupedSubValues = new Set<string>();

		for (const option of safeOptions) {
			if (!value.includes(option.value)) continue;
			entries.push({ option, isChild: false });
			for (const sub of option.subOptions ?? []) {
				if (!value.includes(sub.value)) continue;
				entries.push({ option: sub, isChild: true });
				groupedSubValues.add(sub.value);
			}
		}

		for (const option of safeOptions) {
			for (const sub of option.subOptions ?? []) {
				if (!value.includes(sub.value) || groupedSubValues.has(sub.value)) continue;
				entries.push({ option: sub, isChild: true });
			}
		}

		return entries;
	});
</script>

<div class="label" {id}>{label}</div>
{#if editable}
	<MultipleChoiceDropdown labelledBy={id} options={safeOptions} bind:value />
{:else}
	<ul class="value">
		{#each selectedEntries as entry (entry.option.guid ?? entry.option.value)}
			{@const icon = iconURL(entry.option.icon)}
			<li class:value-suboption={entry.isChild}>
				{#if icon}
					<img alt="" class="value-icon" src={icon} />
				{/if}
				<span class="truncated">{entry.option.label}</span>
			</li>
		{/each}
		{#if selectedEntries.length === 0}
			<li>{$_('empty')}</li>
		{/if}
	</ul>
{/if}

<style>
	.value {
		display: block;
	}

	.value > li {
		align-items: center;
		display: flex;
		gap: 0.35rem;
		list-style: none;
		min-width: 0;
		padding: 0;
		text-align: left;
	}

	.value > li + li {
		margin-top: 0.35rem;
	}

	.value-suboption {
		margin-left: 1.5rem;
	}

	.value-icon {
		flex-shrink: 0;
		height: 1.25rem;
		margin-right: 0.35rem;
		object-fit: contain;
		width: 1.25rem;
	}
</style>
