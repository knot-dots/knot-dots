<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Card from '$lib/components/Card.svelte';
	import OrganizationCard from '$lib/components/OrganizationCard.svelte';
	import { hasMember, isMeasureContainer, isStrategyContainer, isTaskContainer } from '$lib/models';
	import type {
		Container,
		OrganizationalUnitContainer,
		OrganizationContainer,
		TaskContainer
	} from '$lib/models';
	import { user } from '$lib/stores';

	export let containers: Container[];
	export let organizations: OrganizationContainer[];
	export let organizationalUnits: OrganizationalUnitContainer[];

	function isAssignedTo(user: { guid: string }) {
		return (container: TaskContainer) => container.payload.assignee === user.guid;
	}
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
			{#each containers.filter(isMeasureContainer).filter(hasMember($user)) as measure}
				<li>
					<Card --height="100%" container={measure} />
				</li>
			{/each}
		</ul>
	</div>

	<div class="organizations">
		<h3>{$_('profile.my_organizations')}</h3>
		<ul class="carousel">
			{#each [...organizations, ...organizationalUnits] as organization}
				<li>
					<OrganizationCard --height="100%" container={organization} />
				</li>
			{/each}
		</ul>
	</div>

	<div class="strategies">
		<h3>{$_('profile.my_strategies')}</h3>
		<ul class="carousel">
			{#each containers.filter(isStrategyContainer).filter(hasMember($user)) as strategy}
				<li>
					<Card --height="100%" container={strategy} />
				</li>
			{/each}
		</ul>
	</div>
</article>
