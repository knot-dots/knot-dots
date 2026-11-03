<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import Overlay from '~icons/knotdots/overlay';
	import AutoresizingTextarea from '$lib/components/AutoresizingTextarea.svelte';
	import Badges from '$lib/components/Badges.svelte';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import EditableProgress from '$lib/components/EditableProgress.svelte';
	import Editor from '$lib/components/Editor.svelte';
	import PropertiesBar from '$lib/components/PropertiesBar.svelte';
	import Subsection from '$lib/components/Subsection.svelte';
	import Viewer from '$lib/components/Viewer.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import {
		type AnyPayload,
		type Container,
		type GoalPayload,
		isGoalCollectionContainer,
		isObjectiveCollectionContainer,
		isResourceCollectionContainer,
		isSimpleMeasureContainer,
		type KnowledgePayload,
		type MeasurePayload,
		overlayKey,
		overlayURL,
		type ProgramPayload,
		type RulePayload,
		type SimpleMeasurePayload
	} from '$lib/models';
	import { hasSection } from '$lib/relations';
	import { ability } from '$lib/stores';

	interface Props {
		container: Container<
			GoalPayload | KnowledgePayload | MeasurePayload | RulePayload | SimpleMeasurePayload
		>;
		editable?: boolean;
		heading: 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
		parentContainer: Container<ProgramPayload>;
		preview?: boolean;
		relatedContainers: Container<AnyPayload>[];
	}

	let {
		container = $bindable(),
		editable = false,
		heading,
		parentContainer = $bindable(),
		preview = false,
		relatedContainers = $bindable()
	}: Props = $props();

	let subsections = $derived.by(() =>
		hasSection(container, relatedContainers)
			.filter(
				(s) =>
					isGoalCollectionContainer(s) ||
					isObjectiveCollectionContainer(s) ||
					isResourceCollectionContainer(s)
			)
			.map((s) => {
				let _: Container = $state(s); // $state() can only be used in an assignment
				return _;
			})
	);
</script>

<header>
	{#if editable && $ability.can('update', container)}
		<svelte:element this={heading} class="details-heading">
			<AutoresizingTextarea
				bind:value={container.payload.title}
				aria-label={$_('title')}
				placeholder={$_('title')}
				rows={1}
			/>
		</svelte:element>
	{:else}
		<svelte:element this={heading} class="details-heading">
			{container.payload.title}
		</svelte:element>
	{/if}

	{#if editable}
		<ul class="inline-actions is-visible-on-hover">
			<li>
				<ContainerSettingsDropdown bind:container bind:parentContainer bind:relatedContainers />
			</li>
		</ul>
	{/if}
</header>

{#if createFeatureDecisions(page.data.features).useNewPropertyPanel()}
	<PropertiesBar
		bind:container
		editable={editable && $ability.can('update', container)}
		{relatedContainers}
		revisions={[]}
	/>
{:else}
	<Badges bind:container editable={editable && $ability.can('update', container)} />
{/if}

{#if isSimpleMeasureContainer(container)}
	<EditableProgress
		editable={editable && $ability.can('update', container)}
		bind:value={container.payload.progress}
	/>
{/if}

{#if editable && $ability.can('update', container)}
	<Editor bind:value={container.payload.description} />
{:else}
	<Viewer value={container.payload.description} />
{/if}

{#each subsections as { guid }, i (guid)}
	<Subsection
		bind:container={subsections[i]}
		bind:parentContainer={container}
		bind:relatedContainers
		{editable}
	/>
{/each}

{#if !preview}
	<footer class="content-actions">
		<a class="button" href={overlayURL(page.url, overlayKey.enum.view, container.guid)}>
			<Overlay />
			{$_('open_in_overlay', { values: { type: $_(container.payload.type) } })}
		</a>
	</footer>
{/if}

<style>
	.button {
		padding: 0.375rem 0.75rem;
	}

	.content-actions {
		display: flex;
		gap: 0.5rem;
		margin: 0.5rem 0 0;
	}
</style>
