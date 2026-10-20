<script lang="ts">
	interface Props {
		editable?: boolean;
		label: string;
		value: boolean;
	}

	let { editable = false, label, value = $bindable() }: Props = $props();

	const id = crypto.randomUUID();
</script>

<label class="label" for={id}>{label}</label>

<div class="value">
	<input class="toggle" disabled={!editable} {id} type="checkbox" bind:checked={value} />
</div>

<style>
	.toggle {
		--height: 1rem;
		--width: 2.25rem;
	}

	.value {
		background-color: transparent;
	}
</style>
