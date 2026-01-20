<script lang="ts">
	import { _ } from 'svelte-i18n';
	import AuthoredBy from '$lib/components/AuthoredBy.svelte';
	import CreateAnotherButton from '$lib/components/CreateAnotherButton.svelte';
	import CreateCopyButton from '$lib/components/CreateCopyButton.svelte';
	import DeleteButton from '$lib/components/DeleteButton.svelte';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableOrganization from '$lib/components/EditableOrganization.svelte';
	import EditableOrganizationalUnit from '$lib/components/EditableOrganizationalUnit.svelte';
	import EditableVisibility from '$lib/components/EditableVisibility.svelte';
	import EditableImage from '$lib/components/EditableImage.svelte';
	import CategoryTerms from '$lib/components/CategoryTerms.svelte';
	import ManagedBy from '$lib/components/ManagedBy.svelte';
	import PropertyGrid from '$lib/components/PropertyGrid.svelte';
	import RelationButton from '$lib/components/RelationButton.svelte';
	import { predicates, type AnyContainer, type Container, type TermContainer } from '$lib/models';
	import { ability, applicationState } from '$lib/stores';

	interface Props {
		container: TermContainer;
		relatedContainers: Container[];
		revisions: AnyContainer[];
	}

	let { container = $bindable(), relatedContainers, revisions }: Props = $props();

	const editable = $derived(
		$applicationState.containerDetailView.editable && $ability.can('update', container)
	);
</script>

<EditableContainerDetailView bind:container>
	{#snippet data()}
		<PropertyGrid>
			{#snippet top()}
				<label class="field">
					<span>{$_('category.terms.value_label')}</span>
					<input
						type="text"
						required
						disabled={!editable}
						bind:value={container.payload.value}
					/>
				</label>

				<label class="field">
					<span>{$_('category.terms.filter_label')}</span>
					<input
						type="text"
						disabled={!editable}
						bind:value={container.payload.filterLabel}
					/>
				</label>
			{/snippet}

			{#snippet general()}
				<label class="field">
					<span>{$_('category.terms.value_label')}</span>
					<input
						type="text"
						required
						disabled={!editable}
						bind:value={container.payload.value}
					/>
				</label>

				<label class="field">
					<span>{$_('category.terms.filter_label')}</span>
					<input
						type="text"
						disabled={!editable}
						bind:value={container.payload.filterLabel}
					/>
				</label>

				<label class="field">
					<span>{$_('description')}</span>
					<textarea
						rows="3"
						disabled={!editable}
						bind:value={container.payload.description}
					></textarea>
				</label>

				<label class="field">
					<EditableImage
						editable={editable}
						label={$_('category.terms.icon')}
						help={$_('upload.image.svg_only_help')}
						allowedFileTypes={["image/svg+xml"]}
						bind:value={container.payload.icon}
					/>
				</label>

				{#if $ability.can('update', container, 'visibility')}
					<EditableVisibility editable={editable} bind:value={container.payload.visibility} />
				{/if}
			{/snippet}

			{#snippet ownership()}
				<ManagedBy {container} {relatedContainers} />

				<EditableOrganizationalUnit
					editable={editable &&
						$ability.can('update', container.payload.type, 'organizational_unit')}
					organization={container.organization}
					bind:value={container.organizational_unit}
				/>

				<EditableOrganization
					editable={editable && $ability.can('update', container.payload.type, 'organization')}
					bind:value={container.organization}
				/>

				<AuthoredBy {container} {revisions} />
			{/snippet}
		</PropertyGrid>

		<CategoryTerms
			headingKey="category.subterms.heading"
			predicate={predicates.enum['is-part-of']}
			bind:container
			bind:relatedContainers
		/>
	{/snippet}
</EditableContainerDetailView>

<footer class="content-footer bottom-actions-bar">
	<div class="content-actions">
		<RelationButton {container} />
		<CreateAnotherButton {container} {relatedContainers} />
		<CreateCopyButton {container} />
		<DeleteButton {container} {relatedContainers} />
	</div>
</footer>

<style>
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.field input,
	.field textarea {
		border: 1px solid var(--color-gray-200);
		border-radius: 8px;
		padding: 0.5rem;
		font: inherit;
	}

	.field__value {
		color: var(--color-gray-600);
		font-size: 0.875rem;
	}
</style>
