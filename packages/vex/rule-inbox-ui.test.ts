import { afterEach, describe, expect, it } from 'bun:test';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { FakeFs } from 'core/system/testing';
import { CLIENT_HEADER, SEQ_HEADER } from './review-data';
import type { CollectedRuleInbox } from './rule-inbox';
import {
	emptyRuleInboxState,
	RULE_INBOX_DATA_PATH,
	RULE_INBOX_IMAGE_PATH,
	RULE_INBOX_STATE_PATH,
	RULE_INBOX_SUBMIT_PATH,
	type RuleInboxState,
} from './rule-inbox-data';
import { RuleInboxStore } from './rule-inbox-store';
import { ruleInboxMiddleware } from './rule-inbox-ui';

describe('RuleInboxStore & ruleInboxMiddleware', () => {
	let server: Server | null = null;

	afterEach(() => {
		server?.closeAllConnections();
		server?.close();
		server = null;
	});

	async function startServer(
		store: RuleInboxStore,
		opts: StartServerOptions = {},
	): Promise<string> {
		const collected = opts.collected ?? makeCollected();
		const middleware = ruleInboxMiddleware({
			backend: {
				collect: async (sitting) => ({
					...collected,
					data: { ...collected.data, sitting },
				}),
				onSubmit: (_data, state) => {
					opts.submitted?.push(state);
				},
			},
			store,
		});
		server = createServer((req, res) =>
			middleware(req, res, () => res.writeHead(404).end()),
		);
		await new Promise<void>((resolve) => server?.listen(0, resolve));
		return `http://localhost:${(server.address() as AddressInfo).port}`;
	}

	it('persists state across reloads and ignores stale out-of-order PUTs', async () => {
		const fs = new FakeFs();
		const store = new RuleInboxStore(fs, '/shared/git/vex-rule-inbox');
		const base = await startServer(store);

		const newer: RuleInboxState = {
			...emptyRuleInboxState(1),
			decisions: {
				'stem-length': {
					verdict: 'approved',
					note: '',
					fingerprint: FP,
					updatedAt: '2026-11-23T15:00:00Z',
				},
			},
		};
		const stale: RuleInboxState = emptyRuleInboxState(1);

		const res1 = await fetch(base + RULE_INBOX_STATE_PATH, {
			method: 'PUT',
			headers: {
				'content-type': 'application/json',
				[CLIENT_HEADER]: 'tab-1',
				[SEQ_HEADER]: '5',
			},
			body: JSON.stringify(newer),
		});
		expect(res1.status).toBe(204);

		const res2 = await fetch(base + RULE_INBOX_STATE_PATH, {
			method: 'PUT',
			headers: {
				'content-type': 'application/json',
				[CLIENT_HEADER]: 'tab-1',
				[SEQ_HEADER]: '2',
			},
			body: JSON.stringify(stale),
		});
		expect(res2.status).toBe(204);

		const loaded = (await (
			await fetch(base + RULE_INBOX_STATE_PATH)
		).json()) as RuleInboxState;
		expect(loaded).toEqual(newer);

		// A fresh store pointing at the same out-of-worktree dir reads the exact saved progress.
		const freshStore = new RuleInboxStore(fs, '/shared/git/vex-rule-inbox');
		expect(await freshStore.readState()).toEqual(newer);
	});

	it('serves PNG panels and fires onSubmit when submitting a pass', async () => {
		const fs = new FakeFs();
		const store = new RuleInboxStore(fs, '/shared/git/vex-rule-inbox');
		const submittedStates: RuleInboxState[] = [];
		const pngBytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
		const collected = makeCollected(pngBytes);
		const base = await startServer(store, {
			collected,
			submitted: submittedStates,
		});

		const dataRes = await fetch(base + RULE_INBOX_DATA_PATH);
		expect(dataRes.status).toBe(200);

		const imgRes = await fetch(
			`${base}${RULE_INBOX_IMAGE_PATH}/stem-length/after.png`,
		);
		expect(imgRes.status).toBe(200);
		expect(Buffer.from(await imgRes.arrayBuffer())).toEqual(pngBytes);

		const missingRes = await fetch(
			`${base}${RULE_INBOX_IMAGE_PATH}/stem-length/before.png`,
		);
		expect(missingRes.status).toBe(404);

		const submitRes = await fetch(base + RULE_INBOX_SUBMIT_PATH, {
			method: 'POST',
		});
		expect(submitRes.status).toBe(200);
		const body = (await submitRes.json()) as RuleInboxState;
		expect(body.submittedSitting).toBe(1);
		expect(body.submittedAt).toBeTruthy();
		expect(submittedStates).toEqual([body]);
		expect(
			await fs.exists('/shared/git/vex-rule-inbox/submissions/sitting-1.json'),
		).toBe(true);
	});
});

interface StartServerOptions {
	collected?: CollectedRuleInbox;
	submitted?: RuleInboxState[];
}

const FP = {
	note: 'n1',
	fixture: 'f1',
	screenshot: 's1',
	measurements: 'm1',
};

function makeCollected(
	afterBytes = Buffer.from([1, 2, 3]),
): CollectedRuleInbox {
	return {
		data: {
			sitting: 1,
			autoPassedCount: 0,
			entries: [
				{
					id: 'stem-length',
					page: '14',
					pageNumber: 14,
					section: 'Stems',
					rule: 'A stem is 3½ spaces.',
					ruleHtml: '<p>A stem is 3½ spaces.</p>',
					testCaseHtml: null,
					lookForHtml: null,
					status: 'new',
					changedParts: [],
					changeSummary: null,
					approvedDate: null,
					priorNote: null,
					priorTask: null,
					checkState: 'none',
					fingerprint: FP,
					pixelChanged: 0,
					pixelShare: 0,
					width: 100,
					height: 40,
					images: { after: `${RULE_INBOX_IMAGE_PATH}/stem-length/after.png` },
					agentMarks: [],
				},
			],
		},
		panels: new Map([['stem-length', { after: afterBytes }]]),
	};
}
