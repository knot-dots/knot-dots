<div>
	<slot />
</div>

<style>
	div {
		--margin-y: 0.75rem;

		display: flex;
		flex: 1 1;
		gap: var(--margin-y);
		height: calc(100% - 2 * var(--margin-y));
		margin: var(--margin-y) 0.375rem;
		overflow: auto;
	}
</style>
