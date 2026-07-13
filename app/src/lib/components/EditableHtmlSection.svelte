<script lang="ts">
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import { type AnyPayload, type Container, type HtmlPayload } from '$lib/models';
	import { ability } from '$lib/stores';

	interface Props {
		container: Container<HtmlPayload>;
		editable?: boolean;
		parentContainer: Container<AnyPayload>;
		relatedContainers: Container<AnyPayload>[];
	}

	let {
		container = $bindable(),
		editable = false,
		parentContainer = $bindable(),
		relatedContainers = $bindable()
	}: Props = $props();
</script>

<header>
	{#if editable}
		<ul class="inline-actions is-visible-on-hover">
			<li>
				<ContainerSettingsDropdown bind:container bind:parentContainer bind:relatedContainers />
			</li>
		</ul>
	{/if}
</header>

{#if editable && $ability.can('update', container)}
	<textarea bind:value={container.payload.body} />
{:else}
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html container.payload.body}
{/if}

<style>
	textarea {
		font-family: monospace;
	}
</style>
