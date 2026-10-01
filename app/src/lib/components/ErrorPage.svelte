<script lang="ts">
	import { signIn } from '@auth/sveltekit/client';
	import { _ } from 'svelte-i18n';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import logo from '$lib/assets/logo-mark.svg';
	import ErrorState from '$lib/components/ErrorState.svelte';
	import FullscreenLayout from '$lib/components/FullscreenLayout.svelte';
	import PageLayout from '$lib/components/PageLayout.svelte';
	import { getOrganizationURL } from '$lib/models';
	import { user } from '$lib/stores';

	const helpCenterURL =
		'https://knotdots.net/c7648459-5738-44ba-96ae-e04b142ef0ec/dd9cd42a-b9c7-4aae-bd04-290360165408';

	// Missing read permissions are answered with 404 as well, so the variant must not reveal
	// whether the requested content exists.
	const variant = $derived.by(() => {
		if (page.status === 404) {
			return $user.isAuthenticated ? 'not_available' : 'not_public';
		} else if (page.status === 401 || page.status === 403) {
			return $user.isAuthenticated ? 'no_access' : 'login_required';
		} else {
			return 'unexpected';
		}
	});

	// The organization is missing when no route matched or the organization itself isn't
	// available. Then the platform's home page is the way out.
	const organization = $derived(page.data.currentOrganization);

	const homeURL = $derived(
		organization ? getOrganizationURL(organization, '', env).toString() : env.PUBLIC_BASE_URL || '/'
	);

	const homeLabel = $derived(
		organization
			? $_('error.page.home')
			: $_('error.page.go_to', { values: { name: $_('page_title') } })
	);

	const title = $derived(
		`${$_('error.page.title')} – ${organization?.payload.name ?? $_('page_title')}`
	);

	// Going back is only offered after navigating within the app, not for links opened directly.
	let canGoBack = $state(false);

	afterNavigate(({ from }) => {
		canGoBack = from !== null;
	});
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

{#snippet helpCenterLink()}
	<a class="button button-alternate" href={helpCenterURL}>{$_('error.page.help_center')}</a>
{/snippet}

{#snippet errorState()}
	<div class="error-page">
		<ErrorState
			code={page.status}
			description={$_(`error.page.${variant}.description`)}
			help={variant === 'not_available' || variant === 'unexpected' ? helpCenterLink : undefined}
			title={$_(`error.page.${variant}.title`)}
		>
			{#snippet actions()}
				{#if variant === 'not_public' || variant === 'login_required'}
					<button
						class="button-primary"
						onclick={() => signIn('keycloak', { callbackUrl: page.url.href })}
						type="button"
					>
						{$_('login')}
					</button>
					<a class="button button-alternate-outline" href={homeURL}>{homeLabel}</a>
				{:else if variant === 'not_available' || variant === 'no_access'}
					<a class="button button-primary" href={homeURL}>{homeLabel}</a>
					{#if canGoBack}
						<button class="button-alternate-outline" onclick={() => history.back()} type="button">
							{$_('error.page.back')}
						</button>
					{/if}
				{:else}
					<button class="button-primary" onclick={() => location.reload()} type="button">
						{$_('error.page.reload')}
					</button>
					<a class="button button-alternate-outline" href={homeURL}>{homeLabel}</a>
				{/if}
			{/snippet}
		</ErrorState>
	</div>
{/snippet}

{#if organization}
	<PageLayout>
		<FullscreenLayout>
			{#snippet main()}
				{@render errorState()}
			{/snippet}
		</FullscreenLayout>
	</PageLayout>
{:else}
	<div class="error-page-standalone">
		<header>
			<a href={homeURL}><img alt={$_('page_title')} height="24" src={logo} width="24" /></a>
		</header>
		<main>
			{@render errorState()}
		</main>
	</div>
{/if}

<style>
	.error-page {
		display: flex;
		flex: 1;
		overflow-y: auto;
	}

	.error-page-standalone {
		display: flex;
		flex-direction: column;
		min-height: 100dvh;
	}

	.error-page-standalone header {
		align-items: center;
		display: flex;
		flex-shrink: 0;
		height: var(--header-height);
		padding: 0 1rem;
	}

	.error-page-standalone header a {
		display: flex;
	}

	.error-page-standalone main {
		display: flex;
		flex: 1;
	}
</style>
