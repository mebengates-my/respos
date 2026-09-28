// End-to-end dry run of the local mock approval gate:
// applicant -> CAPTCHA proof -> pending -> super user review -> live store.

class LocalStorageShim {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
}
globalThis.localStorage = new LocalStorageShim();

const mock = await import('../src/services/cloudMock.js');
let failed = false;
const assert = (condition, label) => {
  if (condition) console.log(`ok  - ${label}`);
  else {
    failed = true;
    console.error(`FAIL: ${label}`);
  }
};

const applicant = {
  email: 'owner@example.test',
  password: 'strong-password',
  displayName: 'Aisha Rahman',
  storeName: 'Approval Café',
};

const { data: signup } = await mock.mockSignUp(applicant);
assert(Boolean(signup?.user), 'applicant account created');

const { data: challenge } = await mock.mockPrepareStoreApplication({
  ...applicant,
  captchaToken: 'mock-human-check',
});
assert(Boolean(challenge?.captchaProof), 'human check returns a form-bound proof');
const { error: tamperedError } = await mock.mockSubmitStoreApplication({
  ...applicant,
  storeName: 'Changed after CAPTCHA',
  captchaProof: challenge.captchaProof,
});
assert(Boolean(tamperedError), 'changing a verified field invalidates the proof');

const { data: submitted, error: submitError } = await mock.mockSubmitStoreApplication({
  ...applicant,
  captchaProof: challenge.captchaProof,
});
assert(!submitError && submitted?.application?.status === 'pending', 'application is pending');

const { data: storesBefore } = await mock.mockListMyStores();
assert(storesBefore.length === 0, 'no store or owner membership exists before approval');

await mock.mockSignOut();
await mock.mockSignUp({
  email: 'admin@respos.local',
  password: 'super-user-password',
  displayName: 'Platform Creator',
});
const { data: access } = await mock.mockIsPlatformAdmin();
assert(access?.isPlatformAdmin === true, 'configured creator is a platform super user');

const { data: queue } = await mock.mockListStoreApplications();
assert(queue?.applications?.length === 1, 'super user can see the review queue');
const applicationId = queue.applications[0].id;
const { data: reviewed, error: reviewError } = await mock.mockReviewStoreApplication({
  applicationId,
  decision: 'approved',
  reviewNote: 'Identity checked',
});
assert(!reviewError && reviewed?.application?.status === 'approved', 'super user approves application');
assert(Boolean(reviewed?.result?.slug), 'approval creates the public store slug');

await mock.mockSignOut();
await mock.mockSignIn({ email: applicant.email, password: applicant.password });
const { data: storesAfter } = await mock.mockListMyStores();
assert(
  storesAfter.length === 1 && storesAfter[0].role === 'admin',
  'approved owner receives exactly one admin membership'
);
const { data: publicStore } = await mock.mockGetStoreBySlug(reviewed.result.slug);
assert(publicStore?.name === applicant.storeName, 'approved store link now resolves');

console.log(failed ? '\nAPPROVAL DRY RUN FAILED' : '\nAPPROVAL DRY RUN PASSED');
if (failed) process.exitCode = 1;
