<script lang="ts">
	import { ChevronDown, ChevronUp, Icon } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import { env } from '$env/dynamic/public';
	import logo from '$lib/assets/logo.png';
	import { isPartOf } from '$lib/models';
	import type { OrganizationalUnitContainer } from '$lib/models';

	let organizationToggle = false;

	function organizationalUnitURL(container: OrganizationalUnitContainer) {
		const url = new URL(env.PUBLIC_BASE_URL ?? '');
		url.hostname = `${container.payload.slug}.${url.hostname}`;
		url.pathname = `/${container.payload.type}/${container.guid}`;
		return url.toString();
	}

	$: selectedContext = $page.data.currentOrganizationalUnit ?? $page.data.currentOrganization;

	$: organizationalUnitContainers = $page.data.organizationalUnits.filter(
		({ organization }: OrganizationalUnitContainer) =>
			organization === $page.data.currentOrganization.guid
	);

	$: organizationalUnitContainersLevelOne = organizationalUnitContainers.filter(
		({ payload }: OrganizationalUnitContainer) => payload.level === 1
	);
</script>

<div class="organization-menu">
	<button
		class="quiet organization-menu-toggle"
		type="button"
		on:click={() => (organizationToggle = !organizationToggle)}
		aria-controls="organization-menu-details"
		aria-expanded={organizationToggle}
		aria-label={organizationToggle ? $_('close_organization_menu') : $_('open_organization_menu')}
	>
		<img
			alt={$_('logo')}
			class="logo"
			src={selectedContext?.payload.image ? selectedContext.payload.image : logo}
		/>
		<span>
			{selectedContext ? selectedContext.payload.name : 'knotdots.net'}
		</span>
		<Icon src={organizationToggle ? ChevronUp : ChevronDown} size="20" mini />
	</button>
	<div
		class="organization-menu-details"
		class:is-expanded={organizationToggle}
		id="organization-menu-details"
	>
		<div class="organization-menu-organizational-units">
			<h2>
				{#if $page.data.currentOrganization.payload.image}
					<img alt={$_('logo')} src={$page.data.currentOrganization.payload.image} />
				{/if}
				{$page.data.currentOrganization.payload.name}
			</h2>
			<h3>{$_('organizational_units')}</h3>
			<ul class="organizational-units organizational-units--level-1">
				{#each organizationalUnitContainersLevelOne as firstLevelUnit}
					<li>
						<a href={organizationalUnitURL(firstLevelUnit)}>{firstLevelUnit.payload.name}</a>
						<ul class="organizational-units organizational-units--level-2">
							{#each organizationalUnitContainers.filter(isPartOf(firstLevelUnit)) as secondLevelUnit}
								<li>
									<a href={organizationalUnitURL(secondLevelUnit)}>
										{secondLevelUnit.payload.name}
									</a>
								</li>
							{/each}
						</ul>
					</li>
				{/each}
			</ul>
		</div>
		<div class="organization-menu-other-organizations">
			<h2>{$_('home')}</h2>
			<ul>
				<li>
					<a href={env.PUBLIC_BASE_URL}>
						<img alt={$_('home')} class="logo" src={logo} />
						knotdots.net
					</a>
				</li>
				<li>
					<a href="{env.PUBLIC_BASE_URL}/organizations">{$_('other_organizations')}</a>
				</li>
			</ul>
		</div>
	</div>
</div>

<style>
	a:hover {
		background-color: var(--hover-color);
	}

	.logo {
		height: 30px;
		width: auto;
	}

	.organization-menu {
		flex-shrink: 0;
		position: relative;
	}

	.organization-menu h2,
	.organization-menu h3 {
		font-size: 1rem;
		line-height: 1;
		margin-bottom: 1rem;
	}

	.organization-menu h2 {
		align-items: center;
		display: flex;
		gap: 0.5rem;
	}

	.organization-menu-toggle {
		align-items: center;
		display: flex;
		gap: 0.5rem;
		padding: 0.25rem 0.5rem 0.25rem 0.25rem;
	}

	.organization-menu-toggle:active {
		background-color: inherit;
	}

	.organization-menu-toggle span {
		border-right: solid 1px var(--color-gray-200);
		padding-right: 0.75rem;
	}

	.organization-menu-details {
		background-color: white;
		border: 1px solid var(--color-gray-300);
		border-radius: 0.375rem;
		box-shadow: var(--shadow-lg);
		display: none;
		left: 0;
		max-height: 80vh;
		max-width: calc(100vw - 2rem);
		overflow-y: auto;
		padding: 0.625rem;
		position: absolute;
		top: 2.75rem;
	}

	.organization-menu-details.is-expanded {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.organization-menu-organizational-units {
		flex: 1 1;
	}

	.organization-menu-organizational-units > .organizational-units {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
	}

	.organizational-units > li > a {
		display: block;
		padding: 0.5rem 1rem;
		text-align: left;
		white-space: nowrap;
	}

	.organizational-units.organizational-units--level-1 > li > a {
		padding-left: 1rem;
	}

	.organizational-units.organizational-units--level-2 > li > a {
		padding-left: 2rem;
	}

	.organizational-units.organizational-units--level-1 > li > a {
		font-weight: 600;
	}

	.organization-menu-other-organizations {
		flex: 0.5 1 0;
	}

	.organization-menu-other-organizations a {
		display: block;
		padding: 0.5rem;
		text-align: left;
		white-space: nowrap;
	}

	.organization-menu-other-organizations a img {
		display: inline;
		vertical-align: middle;
	}

	@media (min-width: 768px) {
		.organization-menu-details.is-expanded {
			flex-direction: row;
		}

		.organization-menu-organizational-units {
			width: 40vw;
		}
	}
</style>
