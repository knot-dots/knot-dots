<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import SingleChoiceDropdown from '$lib/components/SingleChoiceDropdown.svelte';
	import { type AnyContainer, type Container, findDescendants, predicates } from '$lib/models';

	interface Props {
		editable?: boolean;
		container: Container;
	}

	let { editable = false, container = $bindable() }: Props = $props();

	function currentParentGuid(c: Container): string | null {
		return (
			c.relation.find((r) => r.predicate === predicates.enum['is-part-of'] && r.subject === c.guid)
				?.object ?? null
		);
	}

	// Eligible parents: same type, not self, not a descendant (avoid cycles)
	const allContainers = $derived(((page.data as any)?.containers ?? []) as AnyContainer[]);
	const descendants = $derived(
		findDescendants(container as any, allContainers as any, [predicates.enum['is-part-of']]).map(
			(c) => c.guid
		)
	);

	const options = $derived(
		[{ label: $_('empty'), value: '' }].concat(
			allContainers
				.filter((c) => c.payload.type === container.payload.type)
				.filter((c) => c.guid !== container.guid)
				.filter((c) => !descendants.includes(c.guid))
				.map((c) => ({ label: (c as any).payload?.title ?? c.guid, value: c.guid }))
		)
	);

	// Internal string value for SingleChoiceDropdown interop ('' represents no parent)
	let internal = $state<string>((currentParentGuid(container) ?? '') as string);

	// Note: we intentionally do not constantly sync internal from container here to avoid
	// briefly overriding user selections during form oninput re-renders.

	function setParent(guid: string | null) {
		const index = container.relation.findIndex(
			({ predicate, subject }) =>
				predicate === predicates.enum['is-part-of'] && subject === container.guid
		);

		container.relation = [
			...container.relation.slice(0, index == -1 ? container.relation.length : index),
			...(guid
				? [
						{
							object: guid,
							position: 0,
							predicate: predicates.enum['is-part-of'],
							subject: container.guid
						}
					]
				: []),
			...(index == -1 ? [] : container.relation.slice(index + 1))
		];
	}

	$effect(() => {
		const normalized = internal === '' ? null : internal;
		const current = currentParentGuid(container);
		if (normalized !== current) setParent(normalized);
	});
</script>

{#if editable}
	<SingleChoiceDropdown offset={[0, -39]} {options} bind:value={internal} />
{:else}
	<span class="value">
		{#if internal !== ''}
			{options.find((o) => o.value === internal)?.label}
		{:else}
			{$_('empty')}
		{/if}
	</span>
{/if}
