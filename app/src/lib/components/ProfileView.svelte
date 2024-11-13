<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Card from '$lib/components/Card.svelte';
	import OrganizationCard from '$lib/components/OrganizationCard.svelte';
	import {
		isAssignedTo,
		isContainerWithEffect,
		isOrganizationalUnitContainer,
		isOrganizationContainer,
		isStrategyContainer,
		isTaskContainer
	} from '$lib/models';
	import type { AnyContainer } from '$lib/models';
	import { user } from '$lib/stores';

	export let containers: AnyContainer[];
</script>

<article class="details">
	<div class="tasks">
		<h3>{$_('profile.my_tasks')}</h3>
		<ul class="carousel">
			{#each containers.filter(isTaskContainer).filter(isAssignedTo($user)) as task}
				<li>
					<Card --height="100%" container={task} />
				</li>
			{/each}
		</ul>
	</div>

	<div class="measures">
		<h3>{$_('profile.my_measures')}</h3>
		<ul class="carousel">
			{#each containers.filter(isContainerWithEffect) as measure}
				<li>
					<Card --height="100%" container={measure} />
				</li>
			{/each}
		</ul>
	</div>

	<div class="organizations">
		<h3>{$_('profile.my_organizations')}</h3>
		<ul class="carousel">
			{#each containers.filter((c) => isOrganizationContainer(c) || isOrganizationalUnitContainer(c)) as organization}
				<li>
					<OrganizationCard --height="100%" container={organization} />
				</li>
			{/each}
		</ul>
	</div>

	<div class="strategies">
		<h3>{$_('profile.my_strategies')}</h3>
		<ul class="carousel">
			{#each containers.filter(isStrategyContainer) as strategy}
				<li>
					<Card --height="100%" container={strategy} />
				</li>
			{/each}
		</ul>
	</div>
</article>
