<script lang="ts">
	import { Collapsible } from 'melt/builders';
	import { resource } from 'runed';
	import type { Snippet } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { _ } from 'svelte-i18n';
	import Ellipsis from '~icons/knotdots/ellipsis';
	import { page } from '$app/state';
	import autoSave from '$lib/client/autoSave';
	import fetchContainers from '$lib/client/fetchContainers';
	import fetchRelatedContainers from '$lib/client/fetchRelatedContainers';
	import requestSubmit from '$lib/client/requestSubmit';
	import ColorDropdown from '$lib/components/ColorDropdown.svelte';
	import ContextTabs from '$lib/components/ContextTabs.svelte';
	import CoverUpload from '$lib/components/CoverUpload.svelte';
	import DeleteButton from '$lib/components/DeleteButton.svelte';
	import EditableCoverSection from '$lib/components/EditableCoverSection.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import EditableLogo from '$lib/components/EditableLogo.svelte';
	import Header from '$lib/components/Header.svelte';
	import ImageReplacesNameToggle from '$lib/components/ImageReplacesNameToggle.svelte';
	import OrganizationProperties from '$lib/components/OrganizationProperties.svelte';
	import PropertiesDialog from '$lib/components/PropertiesDialog.svelte';
	import Sections from '$lib/components/Sections.svelte';
	import SettingsDropdown from '$lib/components/SettingsDropdown.svelte';
	import { setBulkActionContext } from '$lib/contexts/bulkAction';
	import { setDetailViewContext } from '$lib/contexts/detailView';
	import { getPropertiesRelocationContext } from '$lib/contexts/propertiesRelocationNotice';
	import { createFeatureDecisions } from '$lib/features';
	import {
		type AnyPayload,
		type Container,
		helpSlug,
		type OrganizationPayload,
		payloadTypes
	} from '$lib/models';
	import { ability, applicationState } from '$lib/stores';
	import { backgroundColors } from '$lib/theme/models';

	interface Props {
		container: Container<OrganizationPayload>;
		layout: Snippet<[Snippet, Snippet]>;
		sections?: Container<AnyPayload>[];
	}

	let { container = $bindable(), layout, sections = [] }: Props = $props();

	let guid = $derived(container.guid);

	let containersQuery = resource([() => guid], async ([guid], _, { signal }) => {
		const [containers, actualData, sectionContainers] = await Promise.all([
			fetchContainers(
				{
					organization: [container.organization],
					payloadType: [
						payloadTypes.enum.effect,
						payloadTypes.enum.goal,
						payloadTypes.enum.indicator_template,
						payloadTypes.enum.measure,
						payloadTypes.enum.objective,
						payloadTypes.enum.program,
						payloadTypes.enum.simple_measure
					]
				},
				'alpha',
				{ signal }
			),
			fetchContainers(
				{
					organization: [container.organization],
					organizationalUnit: [''],
					payloadType: [payloadTypes.enum.actual_data]
				},
				'alpha',
				{ signal }
			),
			fetchRelatedContainers(
				guid,
				{
					relationType: ['is-section-of']
				},
				'alpha',
				{ signal }
			)
		]);
		return [...containers, ...actualData, ...sectionContainers];
	});

	setBulkActionContext({
		actions: ['visibility', 'delete'],
		onSuccess: containersQuery.refetch,
		selected: new SvelteSet<string>()
	});

	let relatedContainers = $derived([...(containersQuery.current ?? sections), container]);

	// svelte-ignore non_reactive_update
	let dialog: HTMLDialogElement;

	const handleSubmit = $derived(autoSave(container, 2000));

	const propertiesRelocationNotice = getPropertiesRelocationContext();

	let detailView = $state({
		properties: new Collapsible({
			onOpenChange: () => {
				propertiesRelocationNotice.seen = true;
			}
		})
	});

	const useNewPropertyPanel = $derived(
		createFeatureDecisions(page.data.features).useNewPropertyPanel()
	);

	if (useNewPropertyPanel) {
		setDetailViewContext(detailView);
	}
</script>

{#snippet header()}
	<Header>
		{#snippet settings()}
			<SettingsDropdown {container} {relatedContainers} />
		{/snippet}
	</Header>
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
							{#if $applicationState.containerDetailView.editable && $ability.can('update', container)}
								<ImageReplacesNameToggle bind:value={container.payload.imageReplacesName} />
							{/if}
						</div>

						<header class="details-section">
							<EditableLogo
								editable={$applicationState.containerDetailView.editable &&
									$ability.can('update', container)}
								bind:value={container.payload.image}
							/>

							{#if !container.payload.imageReplacesName}
								{#if $applicationState.containerDetailView.editable && $ability.can('update', container)}
									<h1
										class="details-title"
										contenteditable="plaintext-only"
										bind:textContent={container.payload.name}
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
										<span class="is-visually-hidden">{$_('organization.properties.title')}</span>
									</button>
								{:else}
									<h1 class="details-title" contenteditable="false">
										{container.payload.name}
									</h1>
								{/if}
							{/if}
						</header>

						{#if !useNewPropertyPanel}
							<PropertiesDialog
								bind:dialog
								{container}
								{relatedContainers}
								title={$_('organization.properties.title')}
							>
								<OrganizationProperties
									bind:container
									editable={$ability.can('update', container)}
								/>
							</PropertiesDialog>
						{/if}

						{#key container.guid}
							<EditableFormattedText
								editable={$applicationState.containerDetailView.editable &&
									$ability.can('update', container)}
								bind:value={container.payload.description}
							/>
						{/key}
					</div>
				</form>

				<Sections bind:container {relatedContainers} />
			</div>

			{#if useNewPropertyPanel}
				<form oninput={requestSubmit} onsubmit={handleSubmit} novalidate>
					<OrganizationProperties
						bind:container
						editable={$applicationState.containerDetailView.editable &&
							$ability.can('update', container)}
					/>
				</form>
			{/if}
		</article>

		<ContextTabs slug={helpSlug.enum['organization-view']} />
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
