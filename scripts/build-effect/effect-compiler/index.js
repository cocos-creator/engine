
const mappings = require('./offline-mappings');
const { options, addChunk, buildEffect } = require('./shdc-lib');
const { stripEditorSupport } = require('./utils');

module.exports = {
  options,
  addChunk,
  buildEffect,
  stripEditorSupport,
  mappings,
};
