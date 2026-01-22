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
			guid: string;
			icon?: string;
			subterms?: Array<{ label: string; value: string; guid: string; icon?: string }>;
		}>;
		value?: string[];
	}

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

	let safeOptions = $derived.by(() =>
		Array.isArray(options)
			? options.map((option) => ({
					...option,
					guid: option.guid ?? option.value,
					subterms: option.subterms?.map((sub) => ({
						...sub,
						guid: sub.guid ?? sub.value
					}))
				}))
			: []
	);

	const id = crypto.randomUUID();
</script>

<div class="label" {id}>{label}</div>
{#if editable}
	<MultipleChoiceDropdown labelledBy={id} options={safeOptions} bind:value />
{:else}
	<ul class="value">
		{#each safeOptions.filter( (o) => value.includes(o.value) ) as selectedOption (selectedOption.guid)}
			{@const icon = iconURL(selectedOption.icon)}
			<li>
				{#if icon}
					<img alt="" class="value-icon" src={icon} />
				{/if}
				{selectedOption.label}
			</li>
		{:else}
			<li>{$_('empty')}</li>
		{/each}
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
		padding: 0;
		text-align: left;
		text-wrap: nowrap;
	}

	.value > li + li {
		margin-top: 0.35rem;
	}

	.value-icon {
		height: 1.25rem;
		margin-right: 0.35rem;
		object-fit: contain;
		width: 1.25rem;
	}
</style>
