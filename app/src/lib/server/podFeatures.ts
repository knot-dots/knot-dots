import fs from 'node:fs/promises';
import { Roarr as log } from 'roarr';
import { isErrorLike, serializeError } from 'serialize-error';

// Feature flags managed at the deployment level: the pod's annotations are
// exposed through a downward API volume and toggled at runtime with
// kubectl annotate. An annotation knotdots.net/{feature}={true|false} takes
// the feature out of the hands of users entirely.
const annotationPattern = /^knotdots\.net\/(\S+)="?(true|false)"?$/;

export function parseAnnotations(contents: string): Map<string, boolean> {
	const flags = new Map<string, boolean>();

	for (const line of contents.split('\n')) {
		const match = line.trim().match(annotationPattern);
		if (match) {
			flags.set(match[1], match[2] == 'true');
		}
	}

	return flags;
}

let warned = false;

// Read on every call; the file system cache makes this cheap and the kernel
// takes care of invalidation.
export async function getPodFeatures(): Promise<Map<string, boolean>> {
	const annotationsPath = process.env.PODINFO_ANNOTATIONS_PATH ?? '/etc/podinfo/annotations';

	try {
		return parseAnnotations(await fs.readFile(annotationsPath, 'utf-8'));
	} catch (error) {
		if (!warned) {
			warned = true;
			log.warn(
				{ annotationsPath, error: isErrorLike(error) ? serializeError(error) : String(error) },
				'Failed to read pod annotations, pod-level feature flags are disabled'
			);
		}
		return new Map();
	}
}
