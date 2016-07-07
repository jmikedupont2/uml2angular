'use strict';

const merge = require('./object_utils').merge;

/**
 * The class holding class data.
 */
class InterfaceData {
  constructor(values) {
    var merged = merge(defaults(), values);
    this.name = merged.name;
    this.tableName = merged.tableName || this.name;
    this.fields = merged.fields;
    this.comment = merged.comment;
    this.dto = merged.dto;
    this.pagination = merged.pagination;
    this.service = merged.service;
    this.operations = merged.operations;
    if (merged.microserviceName) {
      this.microserviceName = merged.microserviceName;
    }
    if (merged.searchEngine) {
      this.searchEngine = merged.searchEngine;
    }
  }

  addOperation(operation) {
    this.operations.push(operation);
    return this;
  }

  /**
   * Adds a field to the class.
   * @param {Object} field the field to add.
   * @return {InterfaceData} this modified class.
   */
  addField(field) {
    this.fields.push(field);
    return this;
  }
}

module.exports = InterfaceData;

function defaults() {
  return {
    name: '',
    tableName: '',
    fields: [],
    operations: [],
    comment: '',
    dto: 'no',
    pagination: 'no',
    service: 'no'
  };
}
