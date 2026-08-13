<script lang="ts">
	import { resource } from 'runed';
	import type { Snippet } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { _ } from 'svelte-i18n';
	import Ellipsis from '~icons/knotdots/ellipsis';
	import { page } from '$app/state';
	import autoSave from '$lib/client/autoSave';
	import fetchRelatedContainers from '$lib/client/fetchRelatedContainers';
	import requestSubmit from '$lib/client/requestSubmit';
	import ColorDropdown from '$lib/components/ColorDropdown.svelte';
	import ContextTabs from '$lib/components/ContextTabs.svelte';
	import CoverUpload from '$lib/components/CoverUpload.svelte';
	import DeleteButton from '$lib/components/DeleteButton.svelte';
	import EditableCoverSection from '$lib/components/EditableCoverSection.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import Header from '$lib/components/Header.svelte';
	import PageProperties from '$lib/components/PageProperties.svelte';
	import PropertiesDialog from '$lib/components/PropertiesDialog.svelte';
	import Sections from '$lib/components/Sections.svelte';
	import { setBulkActionContext } from '$lib/contexts/bulkAction';
	import { getDetailViewContext } from '$lib/contexts/detailView';
	import { createFeatureDecisions } from '$lib/features';
	import {
		type AnyPayload,
		type Container,
		helpSlug,
		type PagePayload,
		predicates
	} from '$lib/models';
	import { ability, applicationState } from '$lib/stores';
	import { backgroundColors } from '$lib/theme/models';

	interface Props {
		container: Container<PagePayload>;
		layout: Snippet<[Snippet, Snippet]>;
		revisions: Container<AnyPayload>[];
		sections: Container[];
	}

	let { container = $bindable(), layout, revisions, sections }: Props = $props();

	let guid = $derived(container.guid);

	let organization = $derived(container.organization);

	let relatedContainersQuery = resource(
		[() => guid, () => organization],
		async ([guid, organization], _, { signal }) =>
			fetchRelatedContainers(
				guid,
				{
					organization: [organization],
					relationType: [
						predicates.enum['is-consistent-with'],
						predicates.enum['is-equivalent-to'],
						predicates.enum['is-inconsistent-with'],
						predicates.enum['is-measured-by'],
						predicates.enum['is-objective-for'],
						predicates.enum['is-part-of'],
						predicates.enum['is-part-of-category'],
						predicates.enum['is-section-of']
					]
				},
				'alpha',
				{ signal }
			)
	);

	setBulkActionContext({
		actions: ['visibility', 'delete'],
		onSuccess: relatedContainersQuery.refetch,
		selected: new SvelteSet<string>()
	});

	let relatedContainers = $derived(relatedContainersQuery.current ?? sections);

	// svelte-ignore non_reactive_update
	let dialog: HTMLDialogElement;

	const handleSubmit = $derived(autoSave(container, 2000));

	const detailView = getDetailViewContext();

	const useNewPropertyPanel = $derived(
		createFeatureDecisions(page.data.features).useNewPropertyPanel()
	);
</script>

{#snippet header()}
	<Header />
{/snippet}

{#snippet main()}
	<div class="content-details">
		<article class="details">
			<div class="details-scroll-wrapper">
				<form oninput={requestSubmit} onsubmit={handleSubmit} novalidate>
					<EditableCoverSection
						bind:container
						editable={$applicationState.containerDetailView.editable &&
							$ability.can('update', container)}
					/>

					<div
						class="stage stage--{container.payload.color
							? backgroundColors.get(container.payload.color)
							: 'white'}"
					>
						<div class="stage--buttons details-section">
							<CoverUpload
								editable={$applicationState.containerDetailView.editable &&
									$ability.can('update', container)}
								label={$_('add_cover')}
								bind:value={container.payload.cover}
							/>
							<ColorDropdown
								buttonStyle="button"
								bind:value={container.payload.color}
								label={$_('highlight')}
								editable={$applicationState.containerDetailView.editable &&
									$ability.can('update', container)}
							/>
						</div>

						<header class="details-section">
							{#if $applicationState.containerDetailView.editable && $ability.can('update', container)}
								<h1
									class="details-title"
									contenteditable="plaintext-only"
									bind:textContent={container.payload.title}
									onkeydown={(e) => (e.key === 'Enter' ? e.preventDefault() : null)}
								></h1>
								<button
									class="action-button"
									onclick={useNewPropertyPanel
										? detailView.properties.trigger.onclick
										: () => dialog.showModal()}
									type="button"
								>
									<Ellipsis />
									<span class="is-visually-hidden">{$_('properties.show_all')}</span>
								</button>
							{:else}
								<h1 class="details-title" contenteditable="false">
									{container.payload.title}
								</h1>
							{/if}
						</header>

						{#if !useNewPropertyPanel}
							<PropertiesDialog
								bind:dialog
								{container}
								{relatedContainers}
								title={$_('organization.properties.title')}
							>
								<PageProperties
									bind:container
									editable={$ability.can('update', container)}
									{relatedContainers}
									{revisions}
								/>
							</PropertiesDialog>
						{/if}

						{#key container.guid}
							<EditableFormattedText
								editable={$applicationState.containerDetailView.editable &&
									$ability.can('update', container)}
								bind:value={container.payload.body}
							/>
						{/key}
					</div>
				</form>

				<Sections bind:container {relatedContainers} />
			</div>

			{#if useNewPropertyPanel}
				<form oninput={requestSubmit} onsubmit={handleSubmit} novalidate>
					<PageProperties
						bind:container
						editable={$applicationState.containerDetailView.editable &&
							$ability.can('update', container)}
						{relatedContainers}
						{revisions}
					/>
				</form>
			{/if}
		</article>

		<ContextTabs slug={helpSlug.enum['page-view']} />
	</div>

	{#if useNewPropertyPanel}
		<footer class="footer-action-bar">
			<DeleteButton {container} {relatedContainers} />
		</footer>
	{/if}
{/snippet}

{@render layout(header, main)}

<style>
	form {
		display: contents;
	}

	.details-scroll-wrapper {
		padding-top: 0;
	}

	header {
		align-items: center;
		display: flex;
		gap: 0.75rem;
	}

	.stage--buttons {
		min-height: 3.125rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding-bottom: 0;
	}

	header button {
		margin-left: auto;
	}

	h1 {
		flex-grow: 1;
		margin: 0;
		min-height: 3rem;
	}

	.stage {
		margin-bottom: 4rem;
		padding-bottom: 0;
	}

	.stage:not(.stage--white) {
		padding-bottom: 2rem;
	}
</style>
