<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Help from '$lib/components/Help.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import { displayName } from '$lib/models';
	import type { PageProps } from './$types';
	import tooltip from '$lib/attachments/tooltip';

	let { data, form }: PageProps = $props();
</script>

<Layout>
	{#snippet main()}
		<div class="content-details">
			{#if form?.errors}
				<ul>
					{#each form.errors as error (error)}
						<li>{error}</li>
					{/each}
				</ul>
			{/if}
			<form class="details" method="POST" enctype="multipart/form-data">
				<section class="details-section">
					<label>
						{$_('import.csv_file')}
						<input accept="text/csv,.csv" name="csv" type="file" required />
					</label>
					{#await data.users then users}
						{#if users.length > 0}
							<label>
								{$_('creator')}
								<select name="creator" value={users[0].guid}>
									{#each users as user (user.guid)}
										<option value={user.guid}>{displayName(user)}</option>
									{/each}
								</select>
							</label>
						{/if}
					{/await}
					<footer>
						<button class="button-primary" type="submit" {@attach tooltip($_('import.submit'))}>
							{$_('import.submit')}
						</button>
					</footer>
				</section>
			</form>
		</div>

		<Help slug="import" />
	{/snippet}
</Layout>
