// Quick smoke test of the mock store-link + PIN login flow (run with node).
// Shim localStorage for Node, then exercise: signup → registerStore (slug) →
// provision staff → resolve store by slug → roster → pinLogin (wrong/locked/right).

class LocalStorageShim {
  constructor() { this.map = new Map(); }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { this.map.set(k, String(v)); }
  removeItem(k) { this.map.delete(k); }
}
globalThis.localStorage = new LocalStorageShim();

const delayStub = (ms = 0) => new Promise((r) => setTimeout(r, ms));
// cloudMock imports helpers only for storage; storage now uses our shim.

const mock = await import('../src/services/cloudMock.js');
const assert = (cond, msg) => {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('ok  -', msg);
};

// 1. Owner signs up + creates a store.
const { data: su, error: suErr } = await mock.mockSignUp({
  email: 'owner@mycafe.test', password: 'secret123', displayName: 'Aisha',
});
assert(!suErr && su?.user, 'owner signup');
const { data: reg, error: regErr } = await mock.mockRegisterStore({
  storeName: 'MyCafe', displayName: 'Aisha',
});
assert(!regErr && reg.store.slug === 'mycafe', `store slug generated (${reg?.store?.slug})`);

// 2. Second store with same name gets a unique slug.
const { data: reg2 } = await mock.mockRegisterStore({ storeName: 'MyCafe', displayName: 'Aisha' });
assert(reg2.store.slug === 'mycafe-2', `slug collision handled (${reg2.store.slug})`);

// 3. Add staff (server) with PIN 1111 through the same path the app uses.
await mock.mockSignOut();
const { data: signin } = await mock.mockSignIn({ email: 'owner@mycafe.test', password: 'secret123' });
assert(signin?.user?.id, 'owner re-signed in');
await mock.mockCreateMember({
  storeId: reg.store.id, displayName: 'Maria Santos', role: 'server',
  email: 'maria@staff.internal', password: '1111',
});

// 4. Store lookup + roster (owner has no PIN → excluded).
const { data: store } = await mock.mockGetStoreBySlug('mycafe');
assert(store?.id === reg.store.id && store?.name === 'MyCafe', 'store resolved by slug');
const { data: roster } = await mock.mockGetStoreRoster('mycafe');
assert(roster.length === 1 && roster[0].name === 'Maria Santos' && roster[0].role === 'server', 'roster lists PIN staff only');

// 5. Wrong PIN → invalid; 5 wrong → locked; correct PIN → session + membership.
const maria = roster[0];
await mock.mockSignOut();
for (let i = 0; i < 4; i++) {
  const { error: e1 } = await mock.mockPinLogin({ slug: 'mycafe', profileId: maria.id, pin: '9999' });
  assert(e1?.reason === 'invalid', `wrong pin #${i + 1} rejected`);
}
const { error: e5 } = await mock.mockPinLogin({ slug: 'mycafe', profileId: maria.id, pin: '9999' });
assert(e5?.reason === 'locked', 'fifth wrong pin locks account');
const { error: eLocked } = await mock.mockPinLogin({ slug: 'mycafe', profileId: maria.id, pin: '1111' });
assert(eLocked?.reason === 'locked', 'correct pin refused while locked');

// Unlock by manipulating time (simulate wait) and succeed.
const db = JSON.parse(localStorage.getItem('cafe-pos-cloud-mock'));
const m = db.memberships.find((x) => x.profileId === maria.id);
m.lockedUntil = Date.now() - 1000;
localStorage.setItem('cafe-pos-cloud-mock', JSON.stringify(db));
const { data: okLogin, error: okErr } = await mock.mockPinLogin({ slug: 'mycafe', profileId: maria.id, pin: '1111' });
assert(!okErr && okLogin?.user && okLogin?.membership?.id === reg.store.id && okLogin.membership.role === 'server',
  'correct pin signs staff in with the right membership');

// 6. Unknown store.
const { data: none } = await mock.mockGetStoreBySlug('does-not-exist');
assert(none === null, 'unknown slug not found');



// 7. Store deletion semantics.
// Give Maria a second membership (store2) directly, like a real shared member.
const db2 = JSON.parse(localStorage.getItem('cafe-pos-cloud-mock'));
db2.memberships.push({
  storeId: reg2.store.id, profileId: maria.id, role: 'server',
  displayName: 'Maria Santos', pin: '2222', active: true, createdAt: Date.now(),
});
localStorage.setItem('cafe-pos-cloud-mock', JSON.stringify(db2));

// Wrong confirmation is rejected.
const { error: wrongConfirm } = await mock.mockDeleteStore({ storeId: reg2.store.id, confirmName: 'nope' });
assert(wrongConfirm, 'wrong confirmation rejected');

// Delete store2: owner + Maria are members of store1 too → no accounts removed.
const { data: del2, error: del2Err } = await mock.mockDeleteStore({ storeId: reg2.store.id, confirmName: 'mycafe-2' });
assert(!del2Err && del2.deleted === true && del2.removedAccounts === 0, 'shared-member store deleted, no accounts removed');
const db3 = JSON.parse(localStorage.getItem('cafe-pos-cloud-mock'));
assert(!db3.stores.some((s) => s.id === reg2.store.id), 'store2 gone');
assert(db3.users.some((u) => u.id === maria.id), 'shared member account survives');
assert(db3.memberships.some((m) => m.profileId === maria.id && m.storeId === reg.store.id), 'shared member keeps other membership');

// Delete store1 (confirm by name): owner + Maria only had this store now → both accounts removed.
const { data: del1 } = await mock.mockDeleteStore({ storeId: reg.store.id, confirmName: 'MyCafe' });
assert(del1.deleted === true && del1.removedAccounts === 2, 'exclusive accounts removed with their store');
const db4 = JSON.parse(localStorage.getItem('cafe-pos-cloud-mock'));
assert(db4.stores.length === 0 && db4.users.length === 0 && db4.memberships.length === 0, 'tenant fully wiped');

// Unknown id → not found, no error thrown.
const { data: delNone } = await mock.mockDeleteStore({ storeId: 'missing', confirmName: null });
assert(delNone?.deleted === false, 'unknown store id returns not_found');
console.log(process.exitCode ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED (incl. store deletion)');
