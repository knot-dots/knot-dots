<div>
	<slot />
</div>

<style>
	div {
		--margin-y: 0.75rem;

		display: flex;
		flex: 1 1;
		gap: var(--margin-y);
		height: 100%;
		overflow: auto;
		padding: var(--margin-y) 0.375rem;
	}
</style>
