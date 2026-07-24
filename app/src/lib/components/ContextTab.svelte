<script lang="ts" module>
	import type { AnyPayload } from '$lib/models';
</script>

<script lang="ts" generics="P extends AnyPayload">
	import type { Tabs } from 'melt/builders';
	import type { ResourceReturn } from 'runed';
	import { _ } from 'svelte-i18n';
	import Close from '~icons/flowbite/close-outline';
	import tooltip from '$lib/attachments/tooltip';
	import Card from '$lib/components/Card.svelte';
	import EditableGenericDetailView from '$lib/components/EditableGenericDetailView.svelte';
	import { type Container, isContainerWithName, isContainerWithTitle } from '$lib/models';

	interface Props {
		containers: ResourceReturn<Array<Container<P>>>;
		empty: string;
		tabs: Tabs<'' | 'help' | 'knowledge' | 'rules'>;
		title: string;
	}

	let { containers, empty, tabs, title }: Props = $props();

	let selected = $state<Container<P>>();
</script>

<header>
	<ol class="truncated">
		<li>
			{#if selected}
				<button onclick={() => (selected = undefined)} type="button">{title}</button>
			{:else}
				{title}
			{/if}
		</li>

		<li>
			{#if selected}
				{#if isContainerWithName(selected)}
					{selected.payload.name}
				{:else if isContainerWithTitle(selected)}
					{selected.payload.title}
				{/if}
			{/if}
		</li>
	</ol>

	<button
		{@attach tooltip($_('close'))}
		class="action-button"
		onclick={() => (tabs.value = '')}
		type="button"
	>
		<Close />
	</button>
</header>

{#if selected}
	<div class="selected">
		<EditableGenericDetailView bind:container={selected} />
	</div>
{:else if containers.loading}
	<div class="loading-state"></div>
{:else if containers.current?.length}
	<ul class="catalog">
		{#each containers.current as container (container.guid)}
			<li>
				<Card
					--height="100%"
					{container}
					onclick={(e) => {
						e.preventDefault();
						selected = container;
					}}
				/>
			</li>
		{/each}
	</ul>
{:else}
	<div class="empty-state">
		{$_(empty)}
	</div>
{/if}

<style>
	header {
		align-items: center;
		display: flex;
		justify-content: space-between;
		padding: 0.375rem 0.5rem;
	}

	ol {
		color: var(--color-text-accent-strong);
		font-size: 0.875rem;
		font-weight: 500;
		line-height: 1.25;
		padding: 0.375rem 0.5rem;
	}

	ol li {
		display: inline;
	}

	ol li:not(:last-child)::after {
		color: var(--color-text-accent-muted);
		content: '/';
		display: inline-block;
		padding: 0 0.5rem;
	}

	ol button {
		all: unset;
	}

	.catalog {
		padding: 0.5rem 1rem;
		overflow-y: auto;
	}

	.empty-state {
		padding: 0.5rem 1rem;
	}

	.empty-state {
		color: var(--color-gray-700);
		margin: 0;
	}

	.selected {
		--details-padding-x: 1.5rem;
		--details-padding-y: 1.5rem;
		--details-section-padding-x: 0;
		--details-section-padding-y: 0;

		background-color: var(--color-white);
		border: solid 1px var(--color-border-accent-muted);
		border-radius: 24px;
		margin: 1rem;
		min-height: 0;
		overflow-y: auto;
	}
</style>
