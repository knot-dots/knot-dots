<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import {
		containerOfType,
		isTaskContainer,
		paramsFromFragment,
		payloadTypes,
		status
	} from '$lib/models';
	import type { AnyContainer, Container, EmptyContainer, PayloadType } from '$lib/models';
	import { applicationState } from '$lib/stores';
	import ListBox from '$lib/components/ListBox.svelte';

	export let container: AnyContainer | EmptyContainer;

	const payloadTypeOptions = paramsFromFragment($page.url).has('is-part-of-strategy')
		? [
				...[payloadTypes.enum.model, payloadTypes.enum.vision]
					.filter((i) => paramsFromFragment($page.url).has('payloadType', i))
					.map((pt) => ({ value: pt, label: $_(pt), group: $_('payload_group.long_term_goals') })),
				...[payloadTypes.enum.strategic_goal]
					.filter((i) => paramsFromFragment($page.url).has('payloadType', i))
					.map((pt) => ({ value: pt, label: $_(pt), group: $_('payload_group.strategic_goals') })),
				...[payloadTypes.enum.operational_goal]
					.filter((i) => paramsFromFragment($page.url).has('payloadType', i))
					.map((pt) => ({ value: pt, label: $_(pt), group: $_('payload_group.measurable_goals') })),
				...[
					payloadTypes.enum.measure,
					payloadTypes.enum.simple_measure,
					payloadTypes.enum.resolution
				]
					.filter((i) => paramsFromFragment($page.url).has('payloadType', i))
					.map((pt) => ({ value: pt, label: $_(pt), group: $_('payload_group.implementation') })),
				...[payloadTypes.enum.text]
					.filter((i) => paramsFromFragment($page.url).has('payloadType', i))
					.map((pt) => ({ value: pt, label: $_(pt), group: $_('payload_group.misc') }))
			]
		: paramsFromFragment($page.url)
				.getAll('payloadType')
				.map((pt) => ({ value: pt, label: $_(pt) }));

	async function restart(event: Event) {
		const value = (event as CustomEvent).detail.selected?.value;

		if (value === undefined) {
			return;
		}

		container.payload = containerOfType(
			value as PayloadType,
			container.organization,
			container.organizational_unit,
			container.managed_by,
			container.realm
		).payload;

		if ('derivedFrom' in $page.state) {
			const derivedFrom = $page.state.derivedFrom as Container;

			container.payload = {
				...container.payload,
				...('assignee' in derivedFrom.payload && isTaskContainer(container)
					? { assignee: derivedFrom.payload.assignee }
					: undefined),
				...('audience' in derivedFrom.payload && 'audience' in container.payload
					? { audience: derivedFrom.payload.audience }
					: undefined),
				...('category' in derivedFrom.payload && 'category' in container.payload
					? { category: derivedFrom.payload.category }
					: undefined),
				...('resolutionStatus' in derivedFrom.payload && 'resolutionStatus' in container.payload
					? { resolutionStatus: derivedFrom.payload.resolutionStatus }
					: undefined),
				...('status' in derivedFrom.payload && 'status' in container.payload
					? { status: derivedFrom.payload.status }
					: undefined),
				...('taskCategory' in derivedFrom.payload && 'taskCategory' in container.payload
					? { taskCategory: derivedFrom.payload.taskCategory }
					: undefined),
				...('taskStatus' in derivedFrom.payload && 'taskStatus' in container.payload
					? { taskStatus: derivedFrom.payload.taskStatus }
					: undefined),
				...('topic' in derivedFrom.payload && 'topic' in container.payload
					? { topic: derivedFrom.payload.topic }
					: undefined),
				...('visibility' in derivedFrom.payload && 'visibility' in container.payload
					? { visibility: derivedFrom.payload.visibility }
					: undefined)
			};
		}
	}

	applicationState.update((state) => ({
		...state,
		containerForm: {
			activeTab: 'metadata',
			tabs: ['metadata']
		}
	}));
</script>

<fieldset class="form-tab" id="metadata">
	<legend>{$_('form.metadata')}</legend>

	<ListBox
		label={$_('payload_type')}
		options={payloadTypeOptions}
		value={payloadTypes.enum.undefined}
		on:change={restart}
	/>
</fieldset>
