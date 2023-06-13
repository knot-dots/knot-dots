<script lang="ts">
	import { _ } from 'svelte-i18n';
	import IndicatorWizard from '$lib/components/IndicatorWizard.svelte';
	import RelationSelector from '$lib/components/RelationSelector.svelte';
	import { status, sustainableDevelopmentGoals } from '$lib/models';
	import type { Container } from '$lib/models';

	export let container: Container;
	export let isPartOfOptions: Container[];
</script>

<form class="details" method="POST" on:submit|preventDefault>
	<header>
		<label>
			{$_(container.type)}
			<input name="title" type="text" value={container.payload.title} required />
		</label>
	</header>

	<div class="details-content">
		<div class="details-content-column">
			<label>
				{$_('summary')}
				<textarea name="summary" maxlength="200" value={container.payload.summary ?? ''} required />
			</label>
			<label>
				{$_('description')}
				<textarea name="description" value={container.payload.description} required />
			</label>
			{#if 'indicator' in container.payload}
				<IndicatorWizard bind:indicator={container.payload.indicator} />
			{/if}
		</div>
		<div class="details-content-column">
			{#if 'status' in container.payload}
				<label>
					{$_('status.label')}
					<select name="status" required>
						{#each status.options as statusOption}
							<option selected={statusOption === container.payload.status} value={statusOption}>
								{$_(statusOption)}
							</option>
						{/each}
					</select>
				</label>
			{/if}
			<label>
				{$_('category')}
				<select name="category" required>
					<option label="" />
					{#each sustainableDevelopmentGoals.options as goal}
						<option selected={goal === container.payload.category} value={goal}>
							{$_(goal)}
						</option>
					{/each}
				</select>
			</label>
			<RelationSelector
				{isPartOfOptions}
				containerType={container.type}
				selected={container.relation}
			/>
		</div>
	</div>

	<footer>
		<slot name="footer" />
	</footer>
</form>
