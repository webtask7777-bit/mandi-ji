import test from 'node:test';
import assert from 'node:assert/strict';
import { getDashboardSourceCrop, getDashboardCropSearch, getDashboardStateUrl } from '../src/utils/dashboardNavigation.js';
import { dashboardLanguageContext, dashboardLanguageSection, buildLanguageChooserUrl, localizedToolsUrl } from '../src/utils/languageNavigation.js';

const crops = [{ id: 'white-peas' }, { id: 'peasdry' }, { id: 'wheat' }];

test('explicit price selection survives tab and language navigation as its exact source ID', () => {
  const selected = getDashboardCropSearch('?tab=prices&mapCrop=wheat&custom=keep', 'white-peas', crops);
  assert.equal(getDashboardSourceCrop(selected, crops), 'white-peas');
  assert.equal(selected.get('mapCrop'), 'wheat');
  assert.equal(selected.get('custom'), 'keep');
  selected.set('tab', 'delivery');
  const context = dashboardLanguageContext('/', selected.toString());
  const section = dashboardLanguageSection('/', selected.toString());
  const chooser = new URL(buildLanguageChooserUrl({ ...context, toolSection: section }), 'https://example.test');
  assert.equal(chooser.searchParams.get('crop'), 'white-peas');
  assert.equal(chooser.searchParams.get('toolSection'), 'delivery');
  assert.equal(localizedToolsUrl({ ...context, toolLanguage: 'ta' }, 'ta', section), '/ta/mandi-bhav?crop=white-peas#language-delivery');
  assert.equal(getDashboardSourceCrop(selected, crops), 'white-peas', 'returning to prices restores the chosen commodity');
});

test('price selection validates the loaded scope and region changes discard the old commodity', () => {
  for (const id of ['peas', 'WHITE-PEAS', 'white-peas#forged', '__proto__', 'unknown']) {
    assert.equal(getDashboardSourceCrop(new URLSearchParams({ sourceCrop: id }), crops), null);
    assert.equal(getDashboardCropSearch('?sourceCrop=wheat&custom=keep', id, crops).toString(), 'sourceCrop=wheat&custom=keep');
  }
  assert.equal(getDashboardSourceCrop('?sourceCrop=white-peas', []), null, 'unloaded catalogues do not confirm an ID');
  assert.equal(getDashboardSourceCrop('?sourceCrop=white-peas', [{ id: 'peasdry' }]), null, 'another scope never substitutes a similar pea');
  const regional = new URL(getDashboardStateUrl('punjab', '?tab=delivery&sourceCrop=white-peas'), 'https://example.test');
  assert.equal(regional.pathname, '/mandi-bhav/punjab');
  assert.equal(regional.searchParams.get('tab'), 'delivery');
  assert.equal(regional.searchParams.has('sourceCrop'), false);
});
