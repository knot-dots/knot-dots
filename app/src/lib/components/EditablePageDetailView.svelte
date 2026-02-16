<script lang="ts">
	import type { Snippet } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Ellipsis from '~icons/knotdots/ellipsis';
	import { page } from '$app/state';
	import autoSave from '$lib/client/autoSave';
	import requestSubmit from '$lib/client/requestSubmit';
	import ColorDropdown from '$lib/components/ColorDropdown.svelte';
	import EditableCover from '$lib/components/EditableCover.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import Header from '$lib/components/Header.svelte';
	import PageProperties from '$lib/components/PageProperties.svelte';
	import PropertiesDialog from '$lib/components/PropertiesDialog.svelte';
	import Sections from '$lib/components/Sections.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import { type AnyContainer, type PageContainer, predicates } from '$lib/models';
	import { fetchRelatedContainers } from '$lib/remote/data.remote';
	import { ability, applicationState } from '$lib/stores';
	import { backgroundColors } from '$lib/theme/models';
	import transformFileURL from '$lib/transformFileURL';

	interface Props {
		container: PageContainer;
		layout: Snippet<[Snippet, Snippet]>;
		revisions: AnyContainer[];
	}

	let { container = $bindable(), layout, revisions }: Props = $props();

	let guid = $derived(container.guid);

	let organization = $derived(container.organization);

	let relatedContainersQuery = $derived(
		fetchRelatedContainers({
			guid,
			params: {
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
			}
		})
	);

	let relatedContainers = $derived(relatedContainersQuery.current ?? []);

	let w = $state(0);

	// svelte-ignore non_reactive_update
	let dialog: HTMLDialogElement;

	let mayEditStage = $derived(createFeatureDecisions(page.data.features).useStage());

	const handleSubmit = autoSave(container, 2000);
</script>

{#snippet header()}
	<Header />
{/snippet}

{#snippet main()}
	<div class="content-details">
		{#if container.payload.cover}
			<div class="cover-section">
				<img alt={$_('cover')} class="cover" src={transformFileURL(container.payload.cover)} />
			</div>
		{/if}
		<article>
			<div
				class="details stage stage--{container.payload.color
					? backgroundColors.get(container.payload.color)
					: 'white'}"
			>
				<form oninput={requestSubmit} onsubmit={handleSubmit} novalidate>
					<div class="stage--buttons details-section">
						{#if mayEditStage}
							<EditableCover
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
						{/if}
					</div>
					<header class="details-section">
						{#if $applicationState.containerDetailView.editable && $ability.can('update', container)}
							<h1
								class="details-title"
								contenteditable="plaintext-only"
								bind:textContent={container.payload.title}
								onkeydown={(e) => (e.key === 'Enter' ? e.preventDefault() : null)}
							></h1>
						{:else}
							<h1 class="details-title" contenteditable="false">
								{container.payload.title}
							</h1>
						{/if}

						{#if $applicationState.containerDetailView.editable && $ability.can('update', container)}
							<button class="action-button" onclick={() => dialog.showModal()} type="button">
								<Ellipsis />
								<span class="is-visually-hidden">{$_('organization.properties.title')}</span>
							</button>
						{/if}
					</header>

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

					{#key container.guid}
						<EditableFormattedText
							editable={$applicationState.containerDetailView.editable &&
								$ability.can('update', container)}
							bind:value={container.payload.body}
						/>
					{/key}
				</form>
			</div>

			<div class="details" bind:clientWidth={w} style={w ? `--content-width: ${w}px;` : undefined}>
				<Sections bind:container {relatedContainers} />
			</div>
		</article>
	</div>
{/snippet}

{@render layout(header, main)}

<style>
	header {
		align-items: center;
		display: flex;
		gap: 0.75rem;
	}

	.stage--buttons {
		min-height: 4rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	header button {
		margin-left: auto;
	}

	h1 {
		flex-grow: 1;
		margin: 0;
		min-height: 3rem;
	}
</style>
