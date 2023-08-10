<script lang="ts">
	import { _ } from 'svelte-i18n';

	export let label: string;
	export let options: string[] = [];
	export let required = false;
	export let value: string[] = [];

	let listBoxRef: HTMLUListElement;

	function onFocus() {
		if (listBoxRef.querySelector('[aria-selected=true]') === null) {
			let firstChild = listBoxRef.querySelector('[role=option]') as HTMLLIElement;
			firstChild.setAttribute('aria-selected', 'true');
			firstChild.focus();
		} else {
			let selectedElement = listBoxRef.querySelector('[aria-selected=true]') as HTMLLIElement;
			selectedElement.focus();
		}
	}

	function onKeyDown(event: KeyboardEvent) {
		const currentItem = listBoxRef.querySelector('[aria-selected=true]');
		if (currentItem === null) {
			return;
		}

		switch (event.key) {
			case 'ArrowUp':
				if (currentItem.previousElementSibling !== null) {
					currentItem.setAttribute('aria-selected', 'false');
					currentItem.previousElementSibling.setAttribute('aria-selected', 'true');
					(currentItem.previousElementSibling as HTMLLIElement).focus();
				}
				event.preventDefault();
				break;
			case 'ArrowDown':
				if (currentItem.nextElementSibling !== null) {
					currentItem.setAttribute('aria-selected', 'false');
					currentItem.nextElementSibling.setAttribute('aria-selected', 'true');
					(currentItem.nextElementSibling as HTMLLIElement).focus();
				}
				event.preventDefault();
				break;
			case ' ':
				if (currentItem.getAttribute('aria-checked') === 'true') {
					value = value.filter(
						(v) =>
							v !== (currentItem.querySelector('input[type=checkbox]') as HTMLInputElement).value
					);
				} else {
					value = value.concat(
						(currentItem.querySelector('input[type=checkbox]') as HTMLInputElement).value
					);
				}
				event.preventDefault();
				break;
		}
	}

	function onMouseDown(this: HTMLLIElement) {
		listBoxRef.querySelector('[aria-selected=true]')?.setAttribute('aria-selected', 'false');
		this.setAttribute('aria-selected', 'true');
		this.focus();
	}
</script>

<div>
	<!-- svelte-ignore a11y-no-noninteractive-element-interactions a11y-click-events-have-key-events -->
	<p id="label-{label}" on:click={() => listBoxRef.focus()}>{$_(label)}</p>
	<ul
		class="focus-indicator"
		class:invalid={required && value.length == 0}
		class:valid={!required || value.length > 0}
		role="listbox"
		tabindex="0"
		aria-labelledby="label-{label}"
		bind:this={listBoxRef}
		on:focus={onFocus}
		on:keydown={onKeyDown}
	>
		{#each options as option}
			<li
				tabindex="-1"
				role="option"
				aria-checked={value.includes(option)}
				aria-selected="false"
				on:blur={() => listBoxRef.setAttribute('tabindex', '0')}
				on:focus={() => listBoxRef.setAttribute('tabindex', '-1')}
				on:mousedown|preventDefault={onMouseDown}
			>
				<label>
					<input
						tabindex="-1"
						type="checkbox"
						value={option}
						bind:group={value}
						on:click|stopPropagation
					/>
					{$_(option)}
				</label>
			</li>
		{/each}
	</ul>
</div>

<style>
	[role='listbox'] {
		background-color: var(--color-gray-050);
		border: solid 1px var(--color-gray-300);
		border-radius: 8px;
		color: var(--color-gray-500);
		max-height: 8.625rem;
		overflow-y: auto;
		padding: 0.5rem;
	}

	[role='option'] {
		padding: 0.375rem 0.5rem;
		border-radius: 8px;
	}

	[role='option']:focus {
		background-color: var(--focus-color);
		color: white;
		outline: none;
	}

	.invalid {
		background-color: var(--color-red-050);
		border-color: var(--color-red-500);
		color: var(--color-red-700);
	}

	.valid {
		background-color: var(--color-green-050);
		border-color: var(--color-green-500);
		color: var(--color-green-700);
	}
</style>
