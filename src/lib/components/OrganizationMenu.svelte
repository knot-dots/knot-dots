<script lang="ts">
	import { ChevronDown, ChevronUp, Icon } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import { env } from '$env/dynamic/public';
	import logo1 from '$lib/assets/logo-1.svg';
	import logo2 from '$lib/assets/logo-2.svg';
	import logo3 from '$lib/assets/logo-3.svg';
	import { isPartOf } from '$lib/models';
	import type { OrganizationalUnitContainer, OrganizationContainer } from '$lib/models';

	let organizationToggle = false;

	const logos = [logo1, logo2, logo3];
	const randomLogo = logos[Math.floor($page.data.random * logos.length)];

	function toggle() {
		organizationToggle = !organizationToggle;
		if (organizationToggle) {
			document.body.addEventListener('click', toggle);
		} else {
			document.body.removeEventListener('click', toggle);
		}
	}

	function organizationURL(container: OrganizationContainer) {
		const url = new URL(env.PUBLIC_BASE_URL ?? '');
		if (!container.payload.default) {
			url.hostname = `${container.guid}.${url.hostname}`;
			url.pathname = $page.url.pathname;
		}
		return url.toString();
	}

	function organizationalUnitURL(container: OrganizationalUnitContainer) {
		const url = new URL(env.PUBLIC_BASE_URL ?? '');
		url.hostname = `${container.guid}.${url.hostname}`;
		url.pathname = $page.url.pathname;
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
		on:click|stopPropagation={toggle}
		aria-controls="organization-menu-details"
		aria-expanded={organizationToggle}
		aria-label={organizationToggle ? $_('close_organization_menu') : $_('open_organization_menu')}
	>
		<img
			alt={$_('logo')}
			class="logo"
			src={selectedContext?.payload.image ? selectedContext.payload.image : randomLogo}
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
				<a href={organizationURL($page.data.currentOrganization)}>
					{#if $page.data.currentOrganization.payload.image}
						<img alt={$_('logo')} class="logo" src={$page.data.currentOrganization.payload.image} />
					{/if}
					{$page.data.currentOrganization.payload.name}
				</a>
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
								<ul class="organizational-units organizational-units--level-3">
									{#each organizationalUnitContainers.filter(isPartOf(secondLevelUnit)) as thirdLevelUnit}
										<li>
											<a href={organizationalUnitURL(thirdLevelUnit)}>
												{thirdLevelUnit.payload.name}
											</a>
											<ul class="organizational-units organizational-units--level-4">
												{#each organizationalUnitContainers.filter(isPartOf(thirdLevelUnit)) as fourthLevelUnit}
													<li>
														<a href={organizationalUnitURL(fourthLevelUnit)}>
															{fourthLevelUnit.payload.name}
														</a>
													</li>
												{/each}
											</ul>
										</li>
									{/each}
								</ul>
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
						<img alt={$_('home')} class="logo" src={randomLogo} />
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

	.organization-menu h2 a {
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

	.organization-menu-details ul a:hover {
		background-color: var(--hover-color);
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
		font-weight: 600;
		padding-left: 1rem;
	}

	.organizational-units.organizational-units--level-2 > li > a {
		padding-left: 2rem;
	}

	.organizational-units.organizational-units--level-3 > li > a {
		padding-left: 3rem;
	}

	.organizational-units.organizational-units--level-4 > li > a {
		padding-left: 4rem;
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
