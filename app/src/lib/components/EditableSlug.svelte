<script lang="ts">
	import { _ } from 'svelte-i18n';
	import z from 'zod';
	import type { Container, OrganizationalUnitPayload, OrganizationPayload } from '$lib/models';

	interface Props {
		container: Container<OrganizationPayload | OrganizationalUnitPayload>;
		editable?: boolean;
	}

	let { container = $bindable(), editable = false }: Props = $props();

	const id = crypto.randomUUID();

	function oninput(event: Event) {
		const input = event.currentTarget as HTMLInputElement;

		if (input.validity.valid) {
			container.payload.slug = input.value;
		} else {
			event.stopPropagation();
		}
	}
</script>

{#if editable}
	<label class="label" for={id}>{$_('slug')}</label>
	<input
		class="value"
		{id}
		{oninput}
		pattern="[a-z0-9-]+"
		placeholder={z.string().slugify().safeParse(container.payload.name).data ?? undefined}
		type="text"
		value={container.payload.slug}
	/>
{:else}
	<span class="label">{$_('slug')}</span>
	<span class="value">{container.payload.slug}</span>
{/if}

<style>
	input {
		border: none;
	}
</style>
