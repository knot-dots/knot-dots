<script lang="ts">
	import type { Snippet } from 'svelte';
	import { _ } from 'svelte-i18n';
	import DeleteButton from '$lib/components/DeleteButton.svelte';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import Header from '$lib/components/Header.svelte';
	import HelpProperties from '$lib/components/HelpProperties.svelte';
	import Sections from '$lib/components/Sections.svelte';
	import type { AnyContainer, HelpContainer } from '$lib/models';
	import { predicates } from '$lib/models';
	import { fetchRelatedContainers } from '$lib/remote/data.remote';
	import { ability, applicationState } from '$lib/stores';

	interface Props {
		container: HelpContainer;
		layout?: Snippet<[Snippet, Snippet]>;
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
				relationType: [predicates.enum['is-section-of']]
			}
		})
	);

	let relatedContainers = $derived(relatedContainersQuery.current ?? []);
</script>

{#snippet header()}
	<Header sortOptions={[]} workspaceOptions={[]} />
{/snippet}

{#snippet main()}
	<EditableContainerDetailView bind:container>
		{#snippet data()}
			<HelpProperties
				bind:container
				editable={$applicationState.containerDetailView.editable &&
					$ability.can('update', container)}
				relatedContainers={[]}
				{revisions}
			/>

			{#key container.guid}
				<EditableFormattedText
					editable={$applicationState.containerDetailView.editable &&
						$ability.can('update', container)}
					label={$_('body')}
					bind:value={container.payload.body}
				/>
			{/key}

			<Sections bind:container {relatedContainers} />
		{/snippet}
	</EditableContainerDetailView>

	<footer class="content-footer bottom-actions-bar">
		<div class="content-actions">
			<DeleteButton {container} {relatedContainers} />
		</div>
	</footer>
{/snippet}

{#if layout}
	{@render layout(header, main)}
{:else}
	{@render header()}
	{@render main()}
{/if}
