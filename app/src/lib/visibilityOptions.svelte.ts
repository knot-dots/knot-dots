import { format, unwrapFunctionStore } from 'svelte-i18n';
import { page } from '$app/state';
import { type AnyContainer, getManagedBy, visibility } from '$lib/models';

export default function visibilityOptions(
	container: AnyContainer,
	relatedContainers: AnyContainer[]
) {
	const team = $derived(
		getManagedBy(container, [...page.data.organizationalUnits, ...relatedContainers])
	);

	const organization = $derived(
		page.data.organizations.find(({ guid }) => guid === container.organization)
	);

	const _ = unwrapFunctionStore(format);

	const visibilityOptions = $derived([
		{ value: visibility.enum.creator, label: _('visibility.creator') },
		...(team
			? [
					{
						value: visibility.enum.members,
						label:
							'name' in team.payload
								? _('visibility.members_of', {
										values: { name: team.payload.name }
									})
								: _('visibility.team', {
										values: { title: team.payload.title }
									})
					}
				]
			: []),
		{
			value: visibility.enum.organization,
			label: organization
				? _('visibility.members_of', { values: { name: organization.payload.name } })
				: _('visibility.organization')
		},
		{ value: visibility.enum.public, label: _('visibility.public') }
	]);

	return visibilityOptions;
}
