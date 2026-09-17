import type { RequestEvent } from '@sveltejs/kit';
import { expect, test, vi } from 'vitest';
import { addUserFeatures, getFeatures, withFeatures } from './features';

const getPodFeatures = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/podFeatures', () => ({ getPodFeatures }));

async function featuresFor(settingsFeatures: string[], podFeatures: Map<string, boolean>) {
	getPodFeatures.mockResolvedValue(podFeatures);
	const event = {
		locals: { user: { settings: { features: settingsFeatures } } }
	} as RequestEvent;
	let beforeUserFeatures: string[] = [];
	let seenByHandlers: string[] = [];
	await withFeatures({
		event,
		resolve: async () => {
			beforeUserFeatures = [...getFeatures()];
			await addUserFeatures(event);
			seenByHandlers = getFeatures();
			return new Response();
		}
	});
	expect(event.locals.features).toEqual(seenByHandlers);
	return { beforeUserFeatures, features: seenByHandlers };
}

test('passes flags of the user-facing rings through from the settings', async () => {
	const { features } = await featuresFor(['Adoptions', 'ImportFromCsv'], new Map());
	expect(features).toEqual(['Adoptions', 'ImportFromCsv']);
});

test('ignores flags the rings do not offer', async () => {
	const { features } = await featuresFor(['ComputedManagedBy', 'NotAFlag', 'Adoptions'], new Map());
	expect(features).toEqual(['Adoptions']);
});

test('users cannot enable the permission matrix themselves', async () => {
	const { features } = await featuresFor(['PermissionMatrix'], new Map());
	expect(features).toEqual([]);
});

test('lets the deployment govern annotated flags regardless of the settings', async () => {
	const { features } = await featuresFor(
		['Adoptions'],
		new Map([
			['PermissionMatrix', true],
			['Adoptions', false]
		])
	);
	expect(features).toEqual(['PermissionMatrix']);
});

test('serves the deployment-governed flags before the user features join', async () => {
	// withFeatures runs ahead of authentication, so handles like the session
	// callback see the deployment flags alone
	const { beforeUserFeatures } = await featuresFor(
		['Adoptions'],
		new Map([['PermissionMatrix', true]])
	);
	expect(beforeUserFeatures).toEqual(['PermissionMatrix']);
});
