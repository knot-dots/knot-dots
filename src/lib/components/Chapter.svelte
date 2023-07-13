<script lang="ts">
	import { Viewer } from 'bytemd';
	import { Icon, Pencil, PlusSmall } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import {
		isModelContainer,
		isOperationalGoalContainer,
		isStrategicGoalGoalContainer
	} from '$lib/models';
	import type { Container } from '$lib/models';
	import { user } from '$lib/stores';

	export let container: Container;
</script>

<div class="chapter">
	<h3>
		{container.payload.title}
		{#if $user.isAuthenticated}
			<a href="?edit={container.guid}" class="icons-element">
				<Icon solid src={Pencil} size="20" />
			</a>
		{/if}
	</h3>
	{#if 'description' in container.payload}
		<Viewer value={container.payload.description} />
	{/if}
	<footer>
		<a class="button" href="/{container.payload.type}/{container.guid}">{$_('read_more')}</a>
		{#if $user.isAuthenticated}
			{#if isModelContainer(container)}
				<a class="button primary" href="?new=strategic_goal&is-part-of={container.revision}">
					<Icon src={PlusSmall} size="24" mini />
					{$_('strategic_goal')}
				</a>
			{:else if isStrategicGoalGoalContainer(container)}
				<a class="button primary" href="?new=operational_goal&is-part-of={container.revision}">
					<Icon src={PlusSmall} size="24" mini />
					{$_('operational_goal')}
				</a>
			{:else if isOperationalGoalContainer(container)}
				<a class="button primary" href="?new=measure&is-part-of={container.revision}">
					<Icon src={PlusSmall} size="24" mini />
					{$_('measure')}
				</a>
			{/if}
		{/if}
	</footer>
</div>

<style>
	h3 {
		display: flex;
		justify-content: space-between;
		font-weight: 500;
	}

	.chapter {
		padding: 1.5rem;
	}

	.chapter footer {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 1rem;
		margin-top: 1rem;
		padding: 0;
	}
</style>
