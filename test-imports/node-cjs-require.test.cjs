// CommonJS require test with Node.js test runner
const zodCsv = require('../dist/zcsv.cjs');
const { test } = require('node:test');
const assert = require('node:assert');

test('CommonJS imports', async (t) => {
  await t.test('should support namespace import style', () => {
    // Check namespace import style (import * as zodCsv)
    assert.ok(zodCsv, 'zodCsv should be defined');
    assert.ok(zodCsv.zcsv, 'zodCsv.zcsv should be defined');
    assert.strictEqual(typeof zodCsv.parseCSV, 'function', 'parseCSV should be a function');
    assert.strictEqual(typeof zodCsv.parseCSVContent, 'function', 'parseCSVContent should be a function');
    assert.strictEqual(typeof zodCsv.parseRow, 'function', 'parseRow should be a function');
    
    // Check main zcsv object via namespace import
    assert.strictEqual(typeof zodCsv.zcsv.string, 'function', 'zcsv.string should be a function');
    assert.strictEqual(typeof zodCsv.zcsv.number, 'function', 'zcsv.number should be a function');
    assert.strictEqual(typeof zodCsv.zcsv.boolean, 'function', 'zcsv.boolean should be a function');
    assert.strictEqual(typeof zodCsv.zcsv.date, 'function', 'zcsv.date should be a function');
    assert.strictEqual(typeof zodCsv.zcsv.enum, 'function', 'zcsv.enum should be a function');
  });
});