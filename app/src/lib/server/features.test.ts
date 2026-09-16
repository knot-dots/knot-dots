import type { RequestEvent } from '@sveltejs/kit';
import { expect, test, vi } from 'vitest';
import { getFeatures, withFeatures } from './features';

const getPodFeatures = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/podFeatures', () => ({ getPodFeatures }));

async function featuresFor(settingsFeatures: string[], podFeatures: Map<string, boolean>) {
	getPodFeatures.mockResolvedValue(podFeatures);
	const event = {
		locals: { user: { settings: { features: settingsFeatures } } }
	} as RequestEvent;
	let seenByHandlers: string[] = [];
	await withFeatures({
		event,
		resolve: async () => {
			seenByHandlers = getFeatures();
			return new Response();
		}
	});
	expect(event.locals.features).toEqual(seenByHandlers);
	return seenByHandlers;
}

test('passes flags of the user-facing rings through from the settings', async () => {
	expect(await featuresFor(['Adoptions', 'ImportFromCsv'], new Map())).toEqual([
		'Adoptions',
		'ImportFromCsv'
	]);
});

test('ignores flags the rings do not offer', async () => {
	expect(await featuresFor(['ComputedManagedBy', 'NotAFlag', 'Adoptions'], new Map())).toEqual([
		'Adoptions'
	]);
});

test('users cannot enable the permission matrix themselves', async () => {
	expect(await featuresFor(['PermissionMatrix'], new Map())).toEqual([]);
});

test('lets the deployment govern annotated flags regardless of the settings', async () => {
	expect(
		await featuresFor(
			['Adoptions'],
			new Map([
				['PermissionMatrix', true],
				['Adoptions', false]
			])
		)
	).toEqual(['PermissionMatrix']);
});
