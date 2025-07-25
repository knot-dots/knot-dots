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
		type PayloadType
	} from '$lib/models';
	import { mayCreateContainer, newContainer } from '$lib/stores';

	interface Props {
		containers: Container[];
		payloadType: PayloadType[];
	}

	let { containers, payloadType }: Props = $props();

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
</script>

<div>
	{#if payloadType.some( (t) => $mayCreateContainer(t, page.data.currentOrganizationalUnit?.guid ?? page.data.currentOrganization.guid) )}
		{#if payloadType.length === 1}
			<p>
				<button
					class="button button-primary button-xs"
					onclick={() => createContainer(payloadType[0])}
					type="button"
				>
					<Plus />
					{$_(payloadType[0])}
				</button>
			</p>
		{:else}
			<DropDownMenu
				handleChange={(e) =>
					e instanceof CustomEvent && e.detail.selected && createContainer(e.detail.selected)}
				label={$_('object')}
				options={[
					...payloadType
						.filter((t) =>
							$mayCreateContainer(
								t,
								page.data.currentOrganizationalUnit?.guid ?? page.data.currentOrganization.guid
							)
						)
						.map((t) => ({ label: $_(t), value: t }))
				]}
			>
				{#snippet icon()}
					<Plus />
				{/snippet}
			</DropDownMenu>
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
		height: 100%;
		overflow-y: auto;
		padding: 1.5rem;
	}

	div :global(.dropdown-button.dropdown-button--menu) {
		--dropdown-button-default-background: var(--color-primary-700);
		--dropdown-button-active-background: var(--color-primary-900);
		--dropdown-button-hover-background: var(--color-primary-800);
		--dropdown-button-expanded-background: var(--color-primary-700);
		--dropdown-button-default-color: white;
		--dropdown-button-expanded-color: white;
		--dropdown-button-padding: 0.5rem 0.75rem;

		border: none;
		color: white;
		font-size: 0.75rem;
	}

	div :global(.dropdown-button.dropdown-button--menu svg) {
		height: 0.875rem;
		width: 0.875rem;
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
