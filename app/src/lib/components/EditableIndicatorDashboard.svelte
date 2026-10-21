<script lang="ts">
	import { resource } from 'runed';
	import { _ } from 'svelte-i18n';
	import ChartMixed from '~icons/knotdots/chart-mixed';
	import Plus from '~icons/knotdots/plus';
	import tooltip from '$lib/attachments/tooltip';
	import fetchContainers from '$lib/client/fetchContainers';
	import fetchRelatedContainers from '$lib/client/fetchRelatedContainers';
	import saveContainer from '$lib/client/saveContainer';
	import AutoresizingTextarea from '$lib/components/AutoresizingTextarea.svelte';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import IndicatorPicker from '$lib/components/IndicatorPicker.svelte';
	import NewIndicatorCard from '$lib/components/NewIndicatorCard.svelte';
	import {
		type AnyPayload,
		type Container,
		type IndicatorDashboardPayload,
		isIndicatorContainer,
		payloadTypes
	} from '$lib/models';
	import { ability } from '$lib/stores';

	interface Props {
		container: Container<IndicatorDashboardPayload>;
		editable?: boolean;
		heading: 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
		parentContainer: Container<AnyPayload>;
		relatedContainers: Container<AnyPayload>[];
	}

	let {
		container = $bindable(),
		editable = false,
		heading,
		parentContainer = $bindable(),
		relatedContainers = $bindable()
	}: Props = $props();

	const idForTitle = crypto.randomUUID();

	let dialog = $state<HTMLDialogElement>();

	let mayUpdate = $derived(editable && $ability.can('update', container));

	// Every indicator shows the actual data, objectives and effects of the organization or
	// organizational unit the section belongs to, like its detail view does.
	const itemsResource = resource(
		() => container.payload.item,
		async (item, _, { signal }) => {
			if (item.length === 0) {
				return [];
			}

			const indicators = (
				await fetchContainers({ guid: item, payloadType: [payloadTypes.enum.indicator] }, 'alpha', {
					signal
				})
			).filter(isIndicatorContainer);

			return Promise.all(
				indicators.map(async (indicator) => {
					try {
						const related = await fetchRelatedContainers(
							indicator.guid,
							{
								organization: [container.organization],
								organizationalUnit: container.organizational_unit
									? [container.organizational_unit]
									: []
							},
							'alpha',
							{ signal }
						);
						return { indicator, related };
					} catch (error) {
						if (error instanceof DOMException && error.name === 'AbortError') throw error;
						// Show the indicator without data rather than hiding the whole dashboard
						return { indicator, related: [] };
					}
				})
			);
		}
	);

	// Preserve the order of the selection
	let items = $derived(
		container.payload.item.flatMap(
			(guid) => itemsResource.current?.find(({ indicator }) => indicator.guid === guid) ?? []
		)
	);

	async function confirm(selected: string[]) {
		const response = await saveContainer({
			...container,
			payload: { ...container.payload, item: selected }
		});
		if (response.ok) {
			const updatedContainer = await response.json();
			container.payload = updatedContainer.payload;
			container.revision = updatedContainer.revision;
		} else {
			const error = await response.json();
			alert(error.message);
		}
		dialog?.close();
	}
</script>

<header>
	<svelte:element this={heading} class="details-heading">
		{#if mayUpdate}
			<label class="is-visually-hidden" for={idForTitle}>{$_('title')}</label>
			<AutoresizingTextarea
				bind:value={container.payload.title}
				id={idForTitle}
				onkeydown={(e) => {
					if (e.key === 'Enter') {
						e.preventDefault();
					}
				}}
				placeholder={$_('chapter.title.placeholder')}
				rows={1}
			/>
		{:else}
			{container.payload.title}
		{/if}
	</svelte:element>

	{#if editable}
		<ul class="inline-actions is-visible-on-hover">
			{#if mayUpdate && container.payload.item.length > 0}
				<li>
					<button
						class="action-button action-button--size-l"
						onclick={() => dialog?.showModal()}
						type="button"
						{@attach tooltip($_('custom_collection.add_items'))}
					>
						<Plus />
						<span class="is-visually-hidden">{$_('custom_collection.add_items')}</span>
					</button>
				</li>
			{/if}

			<li>
				<ContainerSettingsDropdown bind:container bind:parentContainer bind:relatedContainers />
			</li>
		</ul>
	{/if}
</header>

{#if items.length > 0}
	<ul class="indicators wide">
		{#each items as { indicator, related } (indicator.guid)}
			<li>
				<NewIndicatorCard
					container={indicator}
					ignoreBulkActionContext
					relatedContainers={related}
				/>
			</li>
		{/each}
	</ul>
{:else if mayUpdate && container.payload.item.length === 0}
	<p>{$_('indicator_dashboard.empty')}</p>
	<div class="catalog">
		<button onclick={() => dialog?.showModal()} type="button">
			<ChartMixed />
			{$_('custom_collection.add_items')}
		</button>
	</div>
{/if}

{#if mayUpdate}
	<IndicatorPicker
		bind:dialog
		onconfirm={confirm}
		payloadType={[payloadTypes.enum.indicator]}
		title={$_('custom_collection.dialog.title')}
		value={container.payload.item}
	/>
{/if}

<style>
	.indicators {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
</style>
