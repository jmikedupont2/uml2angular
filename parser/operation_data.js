'use strict';

const merge = require('./object_utils').merge;

/**
 * The class holding field data.
 */
class OperationData {
  constructor(values) {
    var merged = merge(defaults(), values);
    this.name = merged.name;
    this.type = merged.type;
    this.parameters = merged.parameters
  }
}

module.exports = OperationData;

function defaults() {
  return {
    name: '',
    type: '',
    parameters: []
  };
}
