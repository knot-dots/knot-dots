<script lang="ts">
	import {
		BuildingLibrary,
		BuildingStorefront,
		Icon,
		PencilSquare,
		Share,
		UserGroup
	} from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import {
		isMeasureContainer,
		isOrganizationalUnitContainer,
		isOrganizationContainer,
		isStrategyContainer
	} from '$lib/models';
	import type { AnyContainer } from '$lib/models';

	export let container: AnyContainer;
</script>

<aside>
	<ul class="overlay-deep-links">
		<li>
			<a
				class="button"
				href="/{container.payload.type}/{container.guid}/relations"
				title={$_('relations')}
			>
				<Icon src={Share} size="20" mini />
			</a>
		</li>
		{#if isMeasureContainer(container) || isOrganizationContainer(container) || isOrganizationalUnitContainer(container)}
			{#if container.payload.boards.includes('board.organizational_units')}
				<li>
					<a
						class="button"
						href="/{container.payload.type}/{container.guid}/organizational_units"
						title={$_('organizational_units')}
					>
						<Icon src={BuildingLibrary} size="20" mini />
					</a>
				</li>
			{/if}
			{#if container.payload.boards.includes('board.internal_objectives')}
				<li>
					<a
						class="button"
						href="/{container.payload.type}/{container.guid}/internal-objectives"
						title={$_('internal_objective.label')}
					>
						<Icon src={BuildingStorefront} size="20" mini />
					</a>
				</li>
			{/if}
			{#if container.payload.boards.includes('board.tasks')}
				<li>
					<a
						class="button"
						href="/{container.payload.type}/{container.guid}/tasks"
						title={$_('internal_objective.tasks')}
					>
						<Icon src={PencilSquare} size="20" mini />
					</a>
				</li>
			{/if}
		{/if}
		{#if isMeasureContainer(container) || isStrategyContainer(container) || isOrganizationContainer(container) || isOrganizationalUnitContainer(container)}
			<li>
				<a
					class="button"
					href="/{container.payload.type}/{container.guid}/members"
					title={$_('members')}
				>
					<Icon src={UserGroup} size="20" mini />
				</a>
			</li>
		{/if}
	</ul>
</aside>

<style>
	aside {
		margin-left: -5.25rem;
		padding: 0 0.5rem;
		position: fixed;
	}

	ul {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.button {
		--padding-x: 12px;
		--padding-y: 12px;

		width: calc(var(--padding-x) * 2 + 20px);
	}
</style>
