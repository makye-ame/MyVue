import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html>', {
  url: 'http://localhost:3000',
  pretendToBeVisual: true,
  storageQuota: 10000000
});

global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;

global.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};
