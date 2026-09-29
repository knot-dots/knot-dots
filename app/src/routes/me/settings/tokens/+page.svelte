<script lang="ts">
	import { _, date } from 'svelte-i18n';
	import FullscreenLayout from '$lib/components/FullscreenLayout.svelte';
	import Header from '$lib/components/Header.svelte';
	import PageLayout from '$lib/components/PageLayout.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let copied = $state(false);

	async function copyToken(token: string) {
		await navigator.clipboard.writeText(token);
		copied = true;
	}
</script>

<PageLayout>
	<FullscreenLayout>
		{#snippet header()}
			<Header sortOptions={[]} />
		{/snippet}

		{#snippet main()}
			<div class="token-settings">
				<header>
					<h1>{$_('mcp_tokens.title')}</h1>
					<p>{$_('mcp_tokens.description')}</p>
				</header>

				{#if form?.action === 'create' && 'createdToken' in form && form.createdToken}
					{@const createdToken = form.createdToken}
					<section class="created-token system-primary" aria-labelledby="created-token-title">
						<h2 id="created-token-title">{$_('mcp_tokens.created_title')}</h2>
						<p>{$_('mcp_tokens.created_description')}</p>
						<div class="token-value">
							<code>{createdToken}</code>
							<button
								class="button button-xs button-alternate-outline system-primary"
								onclick={() => copyToken(createdToken)}
								type="button"
							>
								{copied ? $_('mcp_tokens.copied') : $_('copy')}
							</button>
						</div>
					</section>
				{/if}

				<section aria-labelledby="create-token-title">
					<h2 id="create-token-title">{$_('mcp_tokens.create')}</h2>
					<form class="create-form" method="POST" action="?/create">
						<label for="token-name">{$_('mcp_tokens.name')}</label>
						<div>
							<input id="token-name" maxlength="100" name="name" required type="text" />
							<button class="button-primary system-primary" type="submit">
								{$_('mcp_tokens.create')}
							</button>
						</div>
						<p class="hint">{$_('mcp_tokens.expiry_hint')}</p>
						{#if form?.action === 'create' && 'error' in form}
							<p class="error">{$_('mcp_tokens.invalid_name')}</p>
						{/if}
					</form>
				</section>

				<section aria-labelledby="tokens-title">
					<h2 id="tokens-title">{$_('mcp_tokens.existing')}</h2>
					{#if data.tokens.length === 0}
						<p>{$_('mcp_tokens.empty')}</p>
					{:else}
						<div class="table-wrapper">
							<table>
								<thead>
									<tr>
										<th>{$_('mcp_tokens.name')}</th>
										<th>{$_('mcp_tokens.token')}</th>
										<th>{$_('mcp_tokens.created')}</th>
										<th>{$_('mcp_tokens.expires')}</th>
										<th>{$_('mcp_tokens.last_used')}</th>
										<th>{$_('mcp_tokens.status')}</th>
										<th><span class="is-visually-hidden">{$_('mcp_tokens.actions')}</span></th>
									</tr>
								</thead>
								<tbody>
									{#each data.tokens as token (token.id)}
										{@const expired = token.expires_at.getTime() <= Date.now()}
										<tr>
											<td>{token.name}</td>
											<td><code>{token.prefix}…</code></td>
											<td>{$date(token.created_at, { dateStyle: 'medium' })}</td>
											<td>{$date(token.expires_at, { dateStyle: 'medium' })}</td>
											<td>
												{token.last_used_at
													? $date(token.last_used_at, { dateStyle: 'medium', timeStyle: 'short' })
													: $_('mcp_tokens.never')}
											</td>
											<td>
												{#if token.revoked_at}
													{$_('mcp_tokens.revoked')}
												{:else if expired}
													{$_('mcp_tokens.expired')}
												{:else}
													{$_('mcp_tokens.active')}
												{/if}
											</td>
											<td>
												{#if !token.revoked_at && !expired}
													<form method="POST" action="?/revoke">
														<input name="id" type="hidden" value={token.id} />
														<button
															class="button-xs button-alternate-outline system-danger"
															type="submit"
														>
															{$_('mcp_tokens.revoke')}
														</button>
													</form>
												{/if}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
						{#if form?.action === 'revoke' && 'error' in form}
							<p class="error">{$_('mcp_tokens.invalid_token')}</p>
						{/if}
					{/if}
				</section>
			</div>
		{/snippet}
	</FullscreenLayout>
</PageLayout>

<style>
	.token-settings {
		color: var(--color-gray-700);
		display: flex;
		flex-direction: column;
		gap: 2rem;
		overflow: auto;
		padding: 2rem;
		width: 100%;
	}

	.token-settings > header,
	.token-settings > section {
		max-width: 70rem;
		width: 100%;
	}

	h1,
	h2 {
		color: var(--color-gray-900);
	}

	h1 {
		font-size: 1.5rem;
	}

	h2 {
		font-size: 1.125rem;
		margin-bottom: 0.75rem;
	}

	.created-token {
		background: var(--color-surface-accent-container);
		border: 1px solid var(--color-border-accent-default);
		border-radius: 0.5rem;
		padding: 1rem;
	}

	.token-value,
	.create-form > div {
		display: flex;
		gap: 0.5rem;
	}

	.token-value {
		align-items: center;
		margin-top: 0.75rem;
	}

	.token-value code {
		background: var(--color-white);
		border: 1px solid var(--color-gray-200);
		border-radius: 0.25rem;
		overflow-wrap: anywhere;
		padding: 0.5rem;
	}

	.create-form {
		max-width: 32rem;
	}

	.create-form label {
		display: block;
		font-weight: 600;
		margin-bottom: 0.25rem;
	}

	.create-form input[type='text'] {
		flex: 1;
	}

	.hint {
		color: var(--color-gray-500);
		font-size: 0.875rem;
		margin-top: 0.25rem;
	}

	.error {
		color: var(--color-red-700);
		margin-top: 0.5rem;
	}

	.table-wrapper {
		margin: 0;
		padding: 0;
	}

	td:last-child,
	th:last-child {
		text-align: right;
	}
</style>
