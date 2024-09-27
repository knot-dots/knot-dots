<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Layout from '$lib/components/Layout.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import type { ActionData, PageData } from './$types';
	import ListBox from '$lib/components/ListBox.svelte';
	import { displayName } from '$lib/models';

	export let data: PageData;
	export let form: ActionData;
</script>

<Layout>
	<Sidebar helpSlug="import" slot="sidebar" />

	<div class="detail-page-content" slot="main">
		<div class="content-details masked-overflow">
			{#if form?.errors}
				<ul>
					{#each form.errors as error}
						<li>{error}</li>
					{/each}
				</ul>
			{/if}
			<form class="details" method="POST" enctype="multipart/form-data">
				<label>
					{$_('import.csv_file')}
					<input accept="text/csv" name="csv" type="file" required />
				</label>
				{#await data.users then users}
					{#if users.length > 0}
						<label>
							{$_('creator')}
							<select name="creator" value={users[0].guid}>
								{#each users as user (user.guid)}
									<option value={user.guid}>{displayName(user)}</option>
								{/each}
								/>
							</select></label
						>
					{/if}
				{/await}
				<footer>
					<button class="primary" type="submit">{$_('import.submit')}</button>
				</footer>
			</form>
		</div>
	</div>
</Layout>
