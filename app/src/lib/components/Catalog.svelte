<script lang="ts">
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Plus from '~icons/flowbite/plus-outline';
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import Card from '$lib/components/Card.svelte';
	import DropDownMenu from '$lib/components/DropDownMenu.svelte';
	import {
		type Container,
		containerOfType,
		type NewContainer,
		overlayKey,
		type PayloadType
	} from '$lib/models';
	import { mayCreateContainer, newContainer } from '$lib/stores';

	interface Props {
		containers: Container[];
	}

	let { containers }: Props = $props();

	const createContainerDialog = getContext<{ getElement: () => HTMLDialogElement }>(
		'createContainerDialog'
	);

	function createContainer(payloadType: PayloadType) {
		$newContainer = containerOfType(
			payloadType,
			page.data.currentOrganization.guid,
			page.data.currentOrganizationalUnit?.guid ?? null,
			page.data.currentOrganizationalUnit?.guid ?? page.data.currentOrganization.guid,
			env.PUBLIC_KC_REALM as string
		) as NewContainer;

		createContainerDialog.getElement().showModal();
	}

	const distinctPayloadTypes = $derived(new Set(containers.map(({ payload }) => payload.type)));
</script>

<div>
	{#if [...distinctPayloadTypes.values()].some( (t) => $mayCreateContainer(t, page.data.currentOrganizationalUnit?.guid ?? page.data.currentOrganization.guid) )}
		{#if distinctPayloadTypes.size === 1}
			{@const payloadType = distinctPayloadTypes.values().next().value as PayloadType}
			<p>
				<button
					class="button button-primary button-xs"
					onclick={() => createContainer(payloadType)}
					type="button"
				>
					<Plus />
					{$_(distinctPayloadTypes.values().next().value as string)}
				</button>
			</p>
		{:else}
			<DropDownMenu
				handleChange={(e) =>
					e instanceof CustomEvent && e.detail.selected && createContainer(e.detail.selected)}
				label={$_('add_item')}
				options={[
					...distinctPayloadTypes
						.values()
						.filter((t) =>
							$mayCreateContainer(
								t,
								page.data.currentOrganizationalUnit?.guid ?? page.data.currentOrganization.guid
							)
						)
						.map((t) => ({ label: $_(t), value: t }))
				]}
			/>
		{/if}
	{/if}
	<ul>
		{#each containers as container}
			<li>
				<Card --height="100%" {container} />
			</li>
		{/each}
	</ul>
</div>

<style>
	div {
		flex: 1 1;
		overflow-y: auto;
		padding: 1.5rem;
	}

	ul {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 1.5rem;
		min-width: calc(100vw - var(--sidebar-max-width) - 3rem);
	}

	ul:nth-child(2) {
		margin-top: 1.5rem;
	}

	li {
		width: 19.5rem;
	}
</style>
