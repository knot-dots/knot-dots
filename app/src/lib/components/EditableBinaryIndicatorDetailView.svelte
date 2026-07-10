<script lang="ts">
	import type { Snippet } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import saveContainer from '$lib/client/saveContainer';
	import BinaryIndicatorProperties from '$lib/components/BinaryIndicatorProperties.svelte';
	import BooleanValueToggle from '$lib/components/BooleanValueToggle.svelte';
	import CreateCopyButton from '$lib/components/CreateCopyButton.svelte';
	import DeleteButton from '$lib/components/DeleteButton.svelte';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import Header from '$lib/components/Header.svelte';
	import {
		type ActualDataPayload,
		type AnyPayload,
		type BinaryIndicatorContainer,
		type Container,
		containerOfType,
		isActualDataContainer,
		type NewContainer,
		payloadTypes,
		predicates
	} from '$lib/models';
	import fetchContainers from '$lib/client/fetchContainers';
	import fetchRelatedContainers from '$lib/client/fetchRelatedContainers';
	import { resource } from 'runed';
	import { ability, applicationState } from '$lib/stores';

	interface Props {
		container: BinaryIndicatorContainer;
		layout: Snippet<[Snippet, Snippet]>;
		revisions: Container<AnyPayload>[];
	}

	let { container = $bindable(), layout, revisions }: Props = $props();

	let guid = $derived(container.guid);

	let title = $derived(container.payload.title);

	let newActualDataContainer = $derived.by(() => {
		const newActualDataContainer = containerOfType(
			payloadTypes.enum.actual_data,
			page.data.currentOrganization.guid,
			page.data.currentOrganizationalUnit?.guid ?? null,
			page.data.currentOrganizationalUnit?.guid ?? page.data.currentOrganization.guid,
			env.PUBLIC_KC_REALM
		) as NewContainer<ActualDataPayload>;
		newActualDataContainer.payload.indicator = guid;
		newActualDataContainer.payload.title = title;
		return newActualDataContainer;
	});

	let organization = $derived(page.data.currentOrganization.guid);
	let organizationalUnit = $derived(page.data.currentOrganizationalUnit?.guid);

	let relatedContainersQuery = resource(
		[() => guid, () => organization, () => organizationalUnit],
		async ([guid, organization, organizationalUnit], _, { signal }) => {
			const [actualData, sections] = await Promise.all([
				fetchContainers(
					{
						organization: [organization],
						...(organizationalUnit ? { organizationalUnit: [organizationalUnit] } : {}),
						payloadType: [payloadTypes.enum.actual_data],
						indicator: [guid]
					},
					'alpha',
					{ signal }
				),
				fetchRelatedContainers(
					guid,
					{ organization: [organization], relationType: [predicates.enum['is-section-of']] },
					'alpha',
					{ signal }
				)
			]);
			return [...actualData, ...sections];
		}
	);

	let relatedContainers = $derived(relatedContainersQuery.current ?? []);

	let actualDataContainer = $derived(
		relatedContainers
			.filter(isActualDataContainer)
			.filter(({ payload }) => payload.indicator === container.guid)
			.map((c) => {
				let _ = $state(c);
				return _;
			})
			.at(0)
	);

	let addingActualData = $state(false);

	function addActualData(container: NewContainer) {
		return async (event: Event) => {
			event.stopPropagation();
			addingActualData = true;

			try {
				const response = await saveContainer(container);
				if (response.ok) {
					await relatedContainersQuery.refetch();
					await invalidate('containers');
				} else {
					const error = await response.json();
					alert(error.message);
				}
			} catch (error: unknown) {
				console.error(error);
			} finally {
				addingActualData = false;
			}
		};
	}

	function updateActualData(container: Container<ActualDataPayload>) {
		return async (value: boolean) => {
			container.payload.booleanValue = value;

			try {
				const response = await saveContainer(container);
				if (response.ok) {
					const updatedContainer = await response.json();
					container.revision = updatedContainer.revision;
					await invalidate('containers');
				} else {
					const error = await response.json();
					alert(error.message);
				}
			} catch (error: unknown) {
				console.error(error);
			}
		};
	}
</script>

{#snippet header()}
	<Header sortOptions={[]} workspaceOptions={[]} />
{/snippet}

{#snippet main()}
	<EditableContainerDetailView bind:container>
		{#snippet data()}
			<BinaryIndicatorProperties
				bind:container
				editable={$applicationState.containerDetailView.editable &&
					$ability.can('update', container)}
				{relatedContainers}
				{revisions}
			/>

			{#key container.guid}
				<EditableFormattedText
					editable={$applicationState.containerDetailView.editable &&
						$ability.can('update', container)}
					label={$_('description')}
					bind:value={container.payload.description}
				/>
			{/key}

			<div class="details-section" oninput={(e) => e.stopPropagation()}>
				{#if $applicationState.containerDetailView.editable && !actualDataContainer && $ability.can('create', newActualDataContainer)}
					{#if addingActualData}
						<span class="loader"></span>
					{:else}
						<button onclick={addActualData(newActualDataContainer)} type="button">
							{$_('binary_indicator.add_actual_data')}
						</button>
					{/if}
				{:else if actualDataContainer}
					<BooleanValueToggle
						bind:checked={
							() => actualDataContainer?.payload.booleanValue ?? false,
							updateActualData(actualDataContainer)
						}
						disabled={!$applicationState.containerDetailView.editable ||
							!$ability.can('update', actualDataContainer)}
						label={$_('binary_indicator.actual_data')}
					/>
				{/if}
			</div>
		{/snippet}
	</EditableContainerDetailView>

	<footer class="content-footer bottom-actions-bar">
		<div class="content-actions">
			<CreateCopyButton {container} />
			<DeleteButton {container} {relatedContainers} />
		</div>
	</footer>
{/snippet}

{@render layout(header, main)}
