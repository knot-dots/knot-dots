<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Dots from '~icons/knotdots/dots';
</script>

<a class="button" href="/all/level">
	<Dots />
	<span class="is-visually-hidden">{$_('dots')}</span>
</a>

<style>
	a {
		--button-background: var(--color-gray-050);

		align-items: center;
		border: none;
		border-radius: 8px;
		box-shadow: var(--shadow-sm);
		color: var(--color-gray-900);
		display: none;
		font-weight: 500;
		height: 2.25rem;
		padding: 0.5rem 0.75rem;
		margin-left: auto;
	}

	a > :global(svg) {
		max-width: none;
	}

	a + :global(.dropdown-group) {
		margin-left: 1rem;
	}

	@container (min-width: 30rem) {
		a {
			display: inline-flex;
		}
	}

	@layer visually-hidden {
		@container (min-width: 60rem) {
			.is-visually-hidden {
				all: revert-layer;
			}
		}
	}
</style>
