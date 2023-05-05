<script lang="ts">
	import { Icon, Share } from 'svelte-hero-icons';

	export let guid: string;
	export let type: string;
	export let title: string;
	export let summary: string;
	export let category: string;
</script>

<a href={`/container/${type}/${guid}`} {title}>
	<article class="card">
		<header>
			<h3>{title}</h3>
			<span class="header-icons">
				<Icon src={Share} size="20" />
			</span>
		</header>
		<div class="text">
			{@html summary}
		</div>
		<footer>
			<div class="badges">
				<span class="badge">{category}</span>
			</div>
		</footer>
	</article>
</a>

<style>
	.card {
		box-sizing: border-box;
		width: 100%;
		padding: 20px;
		background: #ffffff;
		border: 1px solid var(--color-gray-200);
		box-shadow: var(--shadow-md);
		border-radius: 8px;
	}

	header {
		display: flex;
		justify-content: space-between;
	}

	header h3 {
		font-size: 1rem;
		font-weight: 700;
	}

	.header-icons {
		display: flex;
		flex-shrink: 0;
		gap: 12px;
	}

	:global(.header-icons svg) {
		stroke-width: 2.5px;
	}

	.text {
		font-weight: 500;
		font-size: 0.875rem;

		color: var(--color-gray-500);
		margin-top: 20px;
	}

	.badges {
		display: flex;
		flex-direction: row;
		align-items: flex-start;
		gap: 12px;
		margin-top: 20px;
	}

	.badge {
		text-align: center;
		padding: 3px 10px;
		background: var(--color-red-300);
		border-radius: 6px;
	}
</style>
