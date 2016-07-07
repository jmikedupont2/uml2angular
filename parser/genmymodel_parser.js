'use strict';

const _ = require('lodash'),
    AbstractParser = require('./abstract_parser'),
    parser_helper = require('./parser_helper'),
    cardinalities = require('./cardinalities'),
    buildException = require('./exception_factory').buildException,
    exceptions = require('./exception_factory').exceptions;

/**
 * The parser for GenMyModel files.
 */
var GenMyModelParser = module.exports = function (root, databaseTypes) {
  AbstractParser.call(this, root, databaseTypes);
};

GenMyModelParser.prototype = Object.create(AbstractParser.prototype);
GenMyModelParser.prototype.constructor = AbstractParser;

GenMyModelParser.prototype.parse = function () {
  this.findElements();
  this.fillTypes();
  this.fillEnums();
  this.fillClassesAndFields();
  this.fillAssociations();
  this.fillInterfaces();
  return this.parsedData;
};

GenMyModelParser.prototype.findElements = function () {
  this.root.packagedElement.forEach(function (element, index) {
    switch (element.$['xsi:type']) {
      case 'uml:PrimitiveType':
      case 'uml:DataType':
        this.rawTypesIndexes.push(index);
        break;
      case 'uml:Enumeration':
        this.rawEnumsIndexes.push(index);
        break;
      case 'uml:Class':
        this.rawClassesIndexes.push(index);
        break;
      case 'uml:Association':
        this.rawAssociationsIndexes.push(index);
        break;
      case 'uml:Interface':
        this.rawInterfacesIndexes.push(index);
        break;
      default:
    }
  }, this);
};

GenMyModelParser.prototype.fillTypes = function () {
  this.rawTypesIndexes.forEach(function (element) {
    var type = this.root.packagedElement[element];
    this.addType(type.$.name, type.$['xmi:id']);
  }, this);
};

GenMyModelParser.prototype.fillInterfaces = function () {
  this.rawInterfacesIndexes.forEach(function (element) {
    var element = this.root.packagedElement[element];

    if (!element.$.name) {
      throw new buildException(
          exceptions.NullPointer, 'Interface must have a name.');
    }

    this.addInterface(element);

    if (element.ownedAttribute) {
      this.handleAttributesInterface(element);
    }

    if (element.ownedOperation) {
      this.handleOperationsInterface(element);
    }
  }, this);
};

/**
 * Adds a new interface in the interface map.
 * @param {Object} element the interface to add.
 */
GenMyModelParser.prototype.addInterface = function (element) {
  var interfaceData = {
    name: _.upperFirst(element.$.name)
  };

  if (element.eAnnotations && element.eAnnotations[0].details
      && element.eAnnotations[0].details.length > 1
      && element.eAnnotations[0].details[1].$.key === 'gmm-documentation') {
    interfaceData.comment = element.eAnnotations[0].details[1].$.value;
  }

  this.parsedData.addInterface(element.$['xmi:id'], interfaceData);
};

GenMyModelParser.prototype.addType = function (typeName, typeId) {
  if (!this.databaseTypes.contains(_.upperFirst(typeName))) {
    throw new buildException(
        exceptions.WrongType,
        `The type '${typeName}' isn't supported by JHipster.`);
  }
  this.parsedData.addType(typeId, {name: _.upperFirst(typeName)});
};

GenMyModelParser.prototype.fillEnums = function () {
  this.rawEnumsIndexes.forEach(function (index) {
    var enumElement = this.root.packagedElement[index];
    if (!enumElement.$.name) {
      throw new buildException(
          exceptions.NullPointer, "The enumeration's name can't be null.");
    }
    var enumData = {name: enumElement.$.name, values: []};
    if (enumElement.ownedLiteral) {
      enumElement.ownedLiteral.forEach(function (literalIndex) {
        if (!literalIndex.$.name.toUpperCase()) {
          throw new buildException(
              exceptions.NullPointer,
              "The Enumeration's values can't be null.");
        }
        enumData.values.push(literalIndex.$.name.toUpperCase());
      });
    }
    this.parsedData.addEnum(enumElement.$['xmi:id'], enumData);
  }, this);
};

function getAssociationEnds(association) {
  return {
    from: association.ownedEnd[1].$.type,
    to: association.ownedEnd[0].$.type,
    injectedFieldInFrom: association.ownedEnd[0].$.name,
    injectedFieldInTo: association.ownedEnd[1].$.name
  };
}

function getAssociationType(association) {
  if (association.ownedEnd[0].upperValue[0].$.value === '*'
      && association.ownedEnd[1].upperValue[0].$.value === '*') {
    return cardinalities.MANY_TO_MANY;
  } else if (association.ownedEnd[0].upperValue[0].$.value === '*'
      && association.ownedEnd[1].upperValue[0].$.value !== '*') {
    return cardinalities.ONE_TO_MANY;
  } else if (association.ownedEnd[0].upperValue[0].$.value !== '*'
      && association.ownedEnd[1].upperValue[0].$.value === '*') {
    return cardinalities.MANY_TO_ONE;
  }
  return cardinalities.ONE_TO_ONE;
}

function getAssociationComments(association) {
  var comments = {
    commentInFrom: '',
    commentInTo: ''
  };
  if (association.eAnnotations && association.eAnnotations[0].details
      && association.eAnnotations[0].details.length > 1
      && association.eAnnotations[0].details[1].$.key === 'gmm-documentation') {
    comments.commentInFrom = association.eAnnotations[0].details[1].$.value;
    comments.commentInTo = associationData.commentInFrom;
  }
  return comments;
}

GenMyModelParser.prototype.fillAssociations = function () {
  this.rawAssociationsIndexes.forEach(function (element) {
    var association = this.root.packagedElement[element];

    var associationData = getAssociationEnds(association);
    associationData.type = getAssociationType(association);
    var comments = getAssociationComments(association);
    associationData.commentInFrom = comments.commentInFrom;
    associationData.commentInTo = comments.commentInTo;

    this.parsedData.addAssociation(association.$['xmi:id'], associationData);

  }, this);
};

/**
 * Fills the classes and the fields that compose them.
 * @throws NullPointerException if a class' name, or an attribute, is nil.
 */
GenMyModelParser.prototype.fillClassesAndFields = function () {
  this.rawClassesIndexes.forEach(function (classIndex) {
    var element = this.root.packagedElement[classIndex];

    if (!element.$.name) {
      throw new buildException(
          exceptions.NullPointer, 'Classes must have a name.');
    }

    this.checkForUserClass(element);
    this.addClass(element);

    if (element.ownedAttribute) {
      this.handleAttributes(element);
    }

    if (element.ownedOperation) {
      this.handleOperations(element);
    }
  }, this);
};

GenMyModelParser.prototype.checkForUserClass = function (element) {
  if (!this.parsedData.userClassId && element.$.name.toLowerCase() === 'user') {
    this.parsedData.userClassId = element.$['xmi:id'];
  }
};

GenMyModelParser.prototype.handleAttributes = function (element) {
  element.ownedAttribute.forEach(function (attribute) {
    if (!attribute.$.name) {
      throw new buildException(
          exceptions.NullPointer,
          `No name is defined for the passed attribute, for class '${element.$.name}'.`);
    }
    if (!parser_helper.isAnId(attribute.$.name)) {
      this.addField(attribute, element.$['xmi:id']);
    }
  }, this);
};

GenMyModelParser.prototype.handleOperations = function (element) {
  element.ownedOperation.forEach(function (operation) {
    if (!operation.$.name) {
      throw new buildException(
          exceptions.NullPointer,
          `No name is defined for the passed operation, for class '${element.$.name}'.`);
    }
    if (!parser_helper.isAnId(operation.$.name)) {
      this.addOperation(operation, element.$['xmi:id']);
    }
  }, this);
};

GenMyModelParser.prototype.handleOperationsInterface = function (element) {
  element.ownedOperation.forEach(function (operation) {
    if (!operation.$.name) {
      throw new buildException(
          exceptions.NullPointer,
          `No name is defined for the passed operation, for class '${element.$.name}'.`);
    }
    if (!parser_helper.isAnId(operation.$.name)) {
      this.addOperationInterface(operation, element.$['xmi:id']);
    }
  }, this);
};

GenMyModelParser.prototype.handleAttributesInterface = function (element) {
  element.ownedAttribute.forEach(function (attribute) {
    if (!attribute.$.name) {
      throw new buildException(
          exceptions.NullPointer,
          `No name is defined for the passed attribute, for class '${element.$.name}'.`);
    }
    if (!parser_helper.isAnId(attribute.$.name)) {
      this.addFieldInterface(attribute, element.$['xmi:id']);
    }
  }, this);
};

/**
 * Adds a new class in the class map.
 * @param {Object} element the class to add.
 */
GenMyModelParser.prototype.addClass = function (element) {
  var names = parser_helper.extractClassName(element.$.name);
  var classData = {
    name: _.upperFirst(names.entityName),
    tableName: names.tableName
  };
  if (element.eAnnotations && element.eAnnotations[0].details
      && element.eAnnotations[0].details.length > 1
      && element.eAnnotations[0].details[1].$.key === 'gmm-documentation') {
    classData.comment = element.eAnnotations[0].details[1].$.value;
  }

  this.parsedData.addClass(element.$['xmi:id'], classData);
};

/**
 * Adds a new field to the field map.
 * @param {Object} element the field to add.
 * @param {string} classId the encapsulating class' id.
 */
GenMyModelParser.prototype.addField = function (element, classId) {
  this.addRegularField(element, classId);
};

GenMyModelParser.prototype.addOperation = function (element, classId) {
  this.addRegularOperation(element, classId);
};

GenMyModelParser.prototype.addOperationInterface = function (element, classId) {
  this.addRegularOperationInterface(element, classId);
};


/**
 * Adds a new field to the field map.
 * @param {Object} element the field to add.
 * @param {string} interfaceId the encapsulating interface' id.
 */
GenMyModelParser.prototype.addFieldInterface = function (element, interfaceId) {
  this.addRegularFieldInterface(element, interfaceId);
};

/**
 * Adds a (regular, not injected) field to the field map.
 * @param {Object} element the new field to add.
 */
GenMyModelParser.prototype.addRegularFieldInterface = function (element, interfaceId) {
  var fieldData = {name: _.lowerFirst(element.$.name)};

  if (element.$.type) {
    fieldData.type = element.$.type;
  } else if (!element.type) {
    throw new buildException(
        exceptions.WrongField,
        `The field '${element.$.name}' does not possess any type.`);
  } else {
    var typeName =
        _.upperFirst(parser_helper.getTypeNameFromURL(element.type[0].$.href));
    this.addType(typeName, typeName); // id = name
    fieldData.type = typeName;
  }

  if (element.eAnnotations && element.eAnnotations[0].details
      && element.eAnnotations[0].details.length > 1
      && element.eAnnotations[0].details[1].$.key === 'gmm-documentation') {
    fieldData.comment = element.eAnnotations[0].details[1].$.value;
  }

  this.parsedData.addFieldInterface(interfaceId, element.$['xmi:id'], fieldData);
};

/**
 * Adds a (regular, not injected) field to the field map.
 * @param {Object} element the new field to add.
 */
GenMyModelParser.prototype.addRegularField = function (element, classId) {
  var fieldData = {name: _.lowerFirst(element.$.name)};

  if (element.$.type) {
    fieldData.type = element.$.type;
  } else if (!element.type) {
    throw new buildException(
        exceptions.WrongField,
        `The field '${element.$.name}' does not possess any type.`);
  } else {
    var typeName =
        _.upperFirst(parser_helper.getTypeNameFromURL(element.type[0].$.href));
    this.addType(typeName, typeName); // id = name
    fieldData.type = typeName;
  }

  if (element.eAnnotations && element.eAnnotations[0].details
      && element.eAnnotations[0].details.length > 1
      && element.eAnnotations[0].details[1].$.key === 'gmm-documentation') {
    fieldData.comment = element.eAnnotations[0].details[1].$.value;
  }

  this.parsedData.addField(classId, element.$['xmi:id'], fieldData);
};

/**
 * Adds a (regular, not injected) field to the operation map.
 * @param {Object} element the new operation to add.
 */
GenMyModelParser.prototype.addRegularOperation = function (element, classId) {
  var operationData = {
    name: _.lowerFirst(element.$.name),
    parameters: []
  };

  if(element.ownedParameter && element.ownedParameter.length > 0){
    element.ownedParameter.forEach(function(parameter){
      if (parameter.$.type) {
        operationData.type = parameter.$.type;
      } else if (!parameter.type) {
        throw new buildException(
            exceptions.WrongField,
            `The field '${parameter.$.name}' does not possess any type.`);
      } else {
        var typeName =
            _.upperFirst(parser_helper.getTypeNameFromURL(parameter.type[0].$.href));
        //this.addType(typeName, typeName); // id = name
        if(parameter.$.name === "returnParameter"){
          operationData.type = typeName;
        } else{
          operationData.parameters.push({
            type: typeName,
            name: parameter.$.name
          });
        } 
      }
    }, this);
  }

  this.parsedData.addOperation(classId, element.$['xmi:id'], operationData);
};

GenMyModelParser.prototype.addRegularOperationInterface = function (element, interfaceId) {
  var operationData = {
    name: _.lowerFirst(element.$.name),
    parameters: []
  };

  if(element.ownedParameter && element.ownedParameter.length > 0){
    element.ownedParameter.forEach(function(parameter){
      if (parameter.$.type) {
        operationData.type = parameter.$.type;
      } else if (!parameter.type) {
        throw new buildException(
            exceptions.WrongField,
            `The field '${parameter.$.name}' does not possess any type.`);
      } else {
        var typeName =
            _.upperFirst(parser_helper.getTypeNameFromURL(parameter.type[0].$.href));
        //this.addType(typeName, typeName); // id = name
        if(parameter.$.name === "returnParameter"){
          operationData.type = typeName;
        } else{
          operationData.parameters.push({
            type: typeName,
            name: parameter.$.name
          });
        } 
      }
    }, this);
  }

  this.parsedData.addOperationInterface(interfaceId, element.$['xmi:id'], operationData);
};

/**
 * Fills the existing fields with the present validations.
 * @throws NoValidationNameException if no validation name exists for the
 *                                   validation value (1 for no minlength for
 *                                   instance).
 * @throws WrongValidationException if JHipster doesn't support the validation.
 */
GenMyModelParser.prototype.fillConstraints = function () {
  throw new buildException(
      exceptions.UnimplementedOperation,
      'GenMyModel does not support constraints.');
};
