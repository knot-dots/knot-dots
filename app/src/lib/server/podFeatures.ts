import fs from 'node:fs';
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

let cachedFlags = new Map<string, boolean>();
let cachedMtime = -1;
let warned = false;

export function getPodFeatures(): ReadonlyMap<string, boolean> {
	const annotationsPath = process.env.PODINFO_ANNOTATIONS_PATH ?? '/etc/podinfo/annotations';

	try {
		// The kubelet syncs annotation changes into the volume by swapping a
		// symlink, so a changed modification time is the reload signal.
		const { mtimeMs } = fs.statSync(annotationsPath);
		if (mtimeMs != cachedMtime) {
			cachedFlags = parseAnnotations(fs.readFileSync(annotationsPath, 'utf-8'));
			cachedMtime = mtimeMs;
			log.info(
				{ annotationsPath, flags: Object.fromEntries(cachedFlags) },
				'Loaded pod-level feature flags'
			);
		}
	} catch (error) {
		if (!warned) {
			warned = true;
			log.warn(
				{ annotationsPath, error: isErrorLike(error) ? serializeError(error) : String(error) },
				'Failed to read pod annotations, pod-level feature flags are disabled'
			);
		}
		cachedFlags = new Map();
		cachedMtime = -1;
	}

	return cachedFlags;
}
