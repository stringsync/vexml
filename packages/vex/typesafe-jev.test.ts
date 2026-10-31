import { expect, it } from 'bun:test';
import { Credentials } from 'core/creds';
import { FakeSecretStore } from 'core/creds/testing';
import { TypesafeJev } from './typesafe-jev';

it('allows semantic checks to be skipped when the credential source has no key', async () => {
	const client = new TypesafeJev(new Credentials([new FakeSecretStore()]));
	expect(await client.available()).toBe(false);
});
