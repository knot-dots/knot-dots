import { createHash, randomBytes } from 'node:crypto';

export function generateMcpToken() {
	const secret = randomBytes(32).toString('base64url');
	const token = `mcp_pat_${secret}`;

	return {
		token,
		secretHash: hashMcpToken(token),
		prefix: token.slice(0, 16)
	};
}

export function hashMcpToken(token: string) {
	return createHash('sha256').update(token, 'utf8').digest();
}
