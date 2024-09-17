<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	const groups = [
		{
			heading: $_('board.programs'),
			items: [
				{ text: $_('workspace.programs'), value: '/programs' },
				{ text: $_('workspace.programs_by_level'), value: '/programs-by-level' }
			]
		},
		{
			heading: $_('board.implementation'),
			items: [
				{ text: $_('workspace.measures'), value: '/implementation' },
				{ text: $_('workspace.tasks'), value: '/tasks' },
				{ text: $_('workspace.measure_monitoring'), value: '/measure-monitoring' },
				{ text: $_('workspace.measure_templates'), value: '/measure-templates' },
				{ text: $_('workspace.resolutions'), value: '/resolutions' }
			]
		},
		{
			heading: $_('board.indicators'),
			items: [{ text: $_('workspace.indicators'), value: '/indicators' }]
		}
	];
</script>

{#each groups as { heading, items }}
	<li class="group">
		<p>{heading}</p>
		<ul>
			{#each items as { text, value }}
				<li>
					<label>
						<input
							type="radio"
							checked={$page.url.pathname === value}
							on:click={async () => await goto(value)}
						/>
						{text}
					</label>
				</li>
			{/each}
		</ul>
	</li>
{/each}

<style>
	p {
		margin-bottom: 0.5rem;
	}

	ul {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.group {
		border: solid 1px var(--color-gray-100);
		border-radius: 8px;
		overflow-y: auto;
		padding: 0.25rem;
	}
</style>
