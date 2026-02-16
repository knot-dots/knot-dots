<script lang="ts">
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Plus from '~icons/knotdots/plus';
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import { goto } from '$app/navigation';
	import saveContainer from '$lib/client/saveContainer';
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import IndicatorTemplateCard from '$lib/components/IndicatorTemplateCard.svelte';
	import {
		type ActualDataContainer,
		audience,
		computeFacetCount,
		containerOfType,
		indicatorCategories,
		type IndicatorTemplateContainer,
		indicatorTypes,
		type NewContainer,
		overlayKey,
		overlayURL,
		payloadTypes,
		policyFieldBNK,
		sustainableDevelopmentGoals,
		topics,
		units
	} from '$lib/models';
	import { fetchIndicatorDataWegweiserKommune } from '$lib/remote/indicatorDataWegweiserKommune.remote.js';
	import { newContainer } from '$lib/stores';
	import tooltip from '$lib/attachments/tooltip';

	interface Props {
		containers: IndicatorTemplateContainer[];
	}

	let { containers }: Props = $props();

	let orgContext = $derived(page.data.currentOrganizationalUnit ?? page.data.currentOrganization);

	const createContainerDialog = getContext<{ getElement: () => HTMLDialogElement }>(
		'createContainerDialog'
	);

	function createCustomIndicatorTemplate() {
		const container = containerOfType(
			payloadTypes.enum.indicator_template,
			page.data.currentOrganization.guid,
			page.data.currentOrganizationalUnit?.guid ?? null,
			page.data.currentOrganizationalUnit?.guid ?? page.data.currentOrganization.guid,
			env.PUBLIC_KC_REALM as string
		) as NewContainer & Pick<IndicatorTemplateContainer, 'payload'>;

		container.payload.title = '';
		container.payload.unit = units.enum['unit.cubic_meter'];
		container.payload.indicatorCategory = [indicatorCategories.enum['indicator_category.custom']];

		$newContainer = container;

		createContainerDialog.getElement().showModal();
	}

	async function useIndicatorTemplate(template: IndicatorTemplateContainer) {
		const container = containerOfType(
			payloadTypes.enum.actual_data,
			page.data.currentOrganization.guid,
			page.data.currentOrganizationalUnit?.guid ?? null,
			page.data.currentOrganizationalUnit?.guid ?? page.data.currentOrganization.guid,
			env.PUBLIC_KC_REALM as string
		) as NewContainer & Pick<ActualDataContainer, 'payload'>;

		container.payload = {
			...container.payload,
			indicator: template.guid,
			title: template.payload.title,
			values: []
		};

		if (
			'geometry' in orgContext.payload &&
			orgContext.payload.geometry &&
			template.payload.externalReference?.startsWith(
				'https://www.wegweiser-kommune.de/data-api/rest/indicator/get/'
			)
		) {
			const data = await fetchIndicatorDataWegweiserKommune({
				spatialReference: orgContext.payload.geometry,
				friendlyUrl: template.payload.externalReference.split('/').at(-1)!
			});

			if (data) {
				container.payload = {
					...container.payload,
					indicator: template.guid,
					source: data?.source,
					title: template.payload.title,
					values: data?.actual_values.filter((v): v is [number, number] => v[1] != null) ?? []
				};
			}
		}

		try {
			const response = await saveContainer(container);
			if (response.ok) {
				await goto(overlayURL(page.url, overlayKey.enum.view, template.guid));
			} else {
				const error = await response.json();
				alert(error.message);
			}
		} catch (error: unknown) {
			console.error(error);
		}
	}

	async function select(container: IndicatorTemplateContainer) {
		await useIndicatorTemplate(container);
	}

	function stopPropagation(fn: (event: Event) => void) {
		return function (this: Event, event: Event) {
			event.stopPropagation();
			fn.call(this, event);
		};
	}

	let facets = $derived(
		computeFacetCount(
			new Map([
				['audience', new Map(audience.options.map((v) => [v as string, 0]))],
				['category', new Map(sustainableDevelopmentGoals.options.map((v) => [v as string, 0]))],
				['indicatorType', new Map(indicatorTypes.options.map((v) => [v as string, 0]))],
				['indicatorCategory', new Map(indicatorCategories.options.map((v) => [v as string, 0]))],
				['policyFieldBNK', new Map(policyFieldBNK.options.map((v) => [v as string, 0]))],
				['topic', new Map(topics.options.map((v) => [v as string, 0]))]
			]),
			containers
		)
	);
</script>

<Header {facets} workspaceOptions={[]} />

<div class="content-details">
	<div class="details">
		<p class="details-section">
			<button class="template-category" type="button" onclick={createCustomIndicatorTemplate}>
				<Plus />
				{$_('indicator_form.create_custom')}
			</button>
		</p>

		<ul class="details-section">
			{#each containers as container (container.guid)}
				<li>
					<IndicatorTemplateCard --height="100%" {container}>
						{#snippet button()}
							<button
								class="button-square"
								{@attach tooltip($_('indicator_template.select'))}
								type="button"
								onclick={stopPropagation(() => select(container))}
							>
								<Plus />
							</button>
						{/snippet}
					</IndicatorTemplateCard>
				</li>
			{/each}
		</ul>
	</div>
</div>

<Help slug="indicator-catalog" />

<style>
	ul {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 1.5rem;
	}

	li {
		width: 19.5rem;
	}
</style>
