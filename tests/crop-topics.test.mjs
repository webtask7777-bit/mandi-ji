import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CROP_TOPICS, getCropTopic, getTopicById } from '../shared/cropTopics.js';

const root = fileURLToPath(new URL('../server/db/data/', import.meta.url));
const walk = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  const filename = path.join(directory, entry.name);
  return entry.isDirectory() ? walk(filename) : filename;
});
const sourceIds = new Set(walk(root)
  .filter(filename => filename.endsWith('.json') && (
    ['crops.json', 'ticker.json'].includes(path.basename(filename)) || path.basename(path.dirname(filename)) === 'crop-prices'))
  .flatMap(filename => {
    const data = JSON.parse(readFileSync(filename, 'utf8'));
    return (Array.isArray(data) ? data : [data?.crop]).filter(crop => crop?.id).map(crop => crop.id);
  }));
const report = JSON.parse(readFileSync(new URL('../docs/crop-topic-coverage.json', import.meta.url), 'utf8'));

// This compares a separately curated disposition report against every live
// catalog/detail source, so newly introduced commodities cannot silently vanish.
test('every source commodity has exactly one reviewed editorial disposition', () => {
  assert.ok(sourceIds.size >= 392, 'Includes India, CG and state-only commodities');
  assert.equal(report.commodityCount, sourceIds.size);
  assert.equal(report.commodities.length, sourceIds.size);
  assert.deepEqual(report.commodities.map(entry => entry.commodityId).sort(), [...sourceIds].sort());
  const counts = {};
  for (const entry of report.commodities) {
    assert.ok(['curated-crop-topic', 'non-crop', 'mixed-or-unspecified', 'identity-review'].includes(entry.status));
    assert.ok(entry.reason.length > 20, `${entry.commodityId}: actionable disposition reason`);
    assert.ok(entry.sourceNames.length && entry.sourceExample.startsWith('server/db/data/'));
    counts[entry.status] = (counts[entry.status] ?? 0) + 1;
    assert.equal(entry.topicId, getCropTopic(entry.commodityId)?.id ?? null, entry.commodityId);
    assert.equal(entry.status === 'curated-crop-topic', entry.topicId !== null, entry.commodityId);
  }
  assert.deepEqual(counts, report.statusCounts);
  assert.equal(report.topicCount, CROP_TOPICS.length);
});

test('topic membership is unique and refers only to exact existing source IDs', () => {
  const topicIds = CROP_TOPICS.map(topic => topic.id);
  const members = CROP_TOPICS.flatMap(topic => topic.commodityIds);
  assert.equal(new Set(topicIds).size, topicIds.length);
  assert.equal(new Set(members).size, members.length);
  for (const topic of CROP_TOPICS) {
    assert.match(topic.id, /^[a-z][a-z0-9-]*$/);
    assert.ok(topic.nameHi && topic.nameEn && topic.category);
    assert.equal(getTopicById(topic.id), topic);
    for (const id of topic.commodityIds) {
      assert.ok(sourceIds.has(id), `${id}: no invented catalog alias`);
      assert.equal(getCropTopic(id), topic);
      if (topicIds.includes(id)) assert.equal(id, topic.id, `${id}: no topic/commodity collision`);
    }
  }
});

test('known crop forms share editorial context without replacing source IDs', () => {
  for (const [topic, ids] of Object.entries({
    paddy: ['paddy', 'paddycommon', 'paddybasmati', 'rice', 'basmati-rice', 'beaten-rice'],
    wheat: ['wheat', 'wheat-atta'],
    arhar: ['arhar', 'arhartur-red-gramwhole', 'arhar-daltur-dal', 'pegeon-peaarhar-fali'],
    gram: ['gram', 'gram-rawchholia', 'bengal-gramgramwhole', 'bengal-gram-dalchana-dal', 'kabuli-chanachickpeas-white'],
    coconut: ['coconut', 'tender-coconut', 'copra', 'coconut-oil', 'coconut-coir'],
    peas: ['peas', 'field-pea', 'green-peas', 'peasdry'],
    papaya: ['papaya', 'papayaraw'],
    ginger: ['gingergreen', 'gingerdry'],
    coriander: ['corianderleaves', 'corriander-seed'],
    fenugreek: ['methileaves', 'methi-seeds'],
  })) {
    const group = getTopicById(topic);
    for (const id of ids) {
      assert.equal(getCropTopic(id), group, id);
      assert.ok(group.commodityIds.includes(id), `${id}: exact form is retained`);
    }
  }
});

test('similar names never route to the wrong crop or commodity family', () => {
  assert.notEqual(getCropTopic('rajgir'), getCropTopic('amaranthus'), 'Grain amaranth and leafy amaranth need different guides');
  assert.notEqual(getCropTopic('cow'), getCropTopic('cowpea'));
  assert.notEqual(getCropTopic('custard-applesharifa'), getCropTopic('apple'));
  assert.notEqual(getCropTopic('black-gramurd-beanswhole'), getCropTopic('beans'));
  assert.notEqual(getCropTopic('black-pepper'), getCropTopic('chilly-capsicum'));
  assert.notEqual(getCropTopic('chilli'), getCropTopic('capsicum'));
  assert.notEqual(getCropTopic('pumpkin'), getCropTopic('chhappan-kaddu'));
  assert.notEqual(getCropTopic('yam'), getCropTopic('elephant-yamsuran-amorphophallus'));
  assert.notEqual(getCropTopic('roseloose'), getCropTopic('tube-roseloose'));
  assert.equal(getCropTopic('roseloose').id, 'rose', 'Legacy incorrect Hindi name must not control identity');
});

test('ambiguous identities, mixtures and animal goods do not inherit crop advice', () => {
  for (const id of [
    'marget', 'delha', 'kutki', 'muesli', 'white-muesli', 'coleus', 'asalia', 'sweet-saag',
    'absinthe', 'white-pumpkin', 'wild-cucumber', 'tube-flower',
    'millets', 'other-pulses', 'dal-mix', 'otherveg', 'leafy-vegetable',
    'cow', 'fish', 'sheep', 'ghee', 'egg', 'prawn',
  ]) assert.equal(getCropTopic(id), null, id);
  assert.ok(getCropTopic('karamani').commodityIds.includes('cowpealobia-karamani'));
  assert.equal(getCropTopic('hybrid-cumbu').id, 'bajra');
});

test('lookups normalize only surrounding whitespace and case and are prototype-safe', () => {
  assert.equal(getCropTopic('  PADDYCOMMON  '), getTopicById('paddy'));
  assert.equal(getTopicById('  TOMATO  '), getCropTopic('tomato'));
  assert.equal(getTopicById('paddycommon'), null, 'CMS accepts topic IDs, not commodity aliases');
  for (const id of [null, undefined, {}, [], 0, true, '', 'constructor', '__proto__', 'toString',
    'tomato-unverified', 'green-gram', 'wheat/atta', 'धान', 'not-a-crop']) {
    assert.equal(getCropTopic(id), null, String(id));
    assert.equal(getTopicById(id), null, String(id));
  }
});

test('shared topic data cannot be mutated by API or browser consumers', () => {
  assert.ok(Object.isFrozen(CROP_TOPICS));
  const topic = getTopicById('tomato');
  assert.ok(Object.isFrozen(topic));
  assert.ok(Object.isFrozen(topic.commodityIds));
  assert.throws(() => topic.commodityIds.push('cow'), TypeError);
  assert.throws(() => { topic.nameHi = 'wrong'; }, TypeError);
  assert.equal(getCropTopic('cow'), null);
});

test('processed forms are recognised so crop-growing guides are not offered on their pages', async () => {
  const { isProcessedForm } = await import('../shared/cropTopics.js');
  for (const id of ['wheat-atta', 'beaten-rice', 'rice', 'masur-dal', 'mustard-oil']) assert.equal(isProcessedForm(id), true, id);
  for (const id of ['wheat', 'paddycommon', 'lentilmasurwhole', 'mustard']) assert.equal(isProcessedForm(id), false, id);
});
