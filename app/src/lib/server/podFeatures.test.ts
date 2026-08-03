import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { getPodFeatures, parseAnnotations } from './podFeatures';

describe('parseAnnotations', () => {
	it('parses knotdots.net annotations in the downward API line format', () => {
		const flags = parseAnnotations(
			[
				'knotdots.net/ComputedManagedBy="true"',
				'knotdots.net/MultipleProgramAssignment="false"'
			].join('\n')
		);
		expect(flags).toEqual(
			new Map([
				['ComputedManagedBy', true],
				['MultipleProgramAssignment', false]
			])
		);
	});

	it('accepts unquoted values as documented for kubectl annotate', () => {
		expect(parseAnnotations('knotdots.net/ComputedManagedBy=true')).toEqual(
			new Map([['ComputedManagedBy', true]])
		);
	});

	it('ignores annotations of other prefixes and malformed values', () => {
		const flags = parseAnnotations(
			[
				'kubernetes.io/config.seen="2026-08-03T09:00:00Z"',
				'knotdots.net/ComputedManagedBy="maybe"',
				'knotdots.net/MultipleProgramAssignment="true"'
			].join('\n')
		);
		expect(flags).toEqual(new Map([['MultipleProgramAssignment', true]]));
	});

	it('returns an empty map for empty contents', () => {
		expect(parseAnnotations('')).toEqual(new Map());
	});
});

describe('getPodFeatures', () => {
	const previousPath = process.env.PODINFO_ANNOTATIONS_PATH;

	afterEach(() => {
		if (previousPath == undefined) {
			delete process.env.PODINFO_ANNOTATIONS_PATH;
		} else {
			process.env.PODINFO_ANNOTATIONS_PATH = previousPath;
		}
	});

	it('returns an empty map when the annotations file is missing', async () => {
		process.env.PODINFO_ANNOTATIONS_PATH = path.join(os.tmpdir(), 'does-not-exist');
		expect(await getPodFeatures()).toEqual(new Map());
	});

	it('reads the annotations file and picks up modifications', async () => {
		const annotationsPath = path.join(
			fs.mkdtempSync(path.join(os.tmpdir(), 'podinfo-')),
			'annotations'
		);
		process.env.PODINFO_ANNOTATIONS_PATH = annotationsPath;

		fs.writeFileSync(annotationsPath, 'knotdots.net/ComputedManagedBy="true"\n');
		expect(await getPodFeatures()).toEqual(new Map([['ComputedManagedBy', true]]));

		fs.writeFileSync(annotationsPath, 'knotdots.net/ComputedManagedBy="false"\n');
		expect(await getPodFeatures()).toEqual(new Map([['ComputedManagedBy', false]]));
	});
});
