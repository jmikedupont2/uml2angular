var Transform = require('readable-stream/transform');
var rs = require('replacestream');
var istextorbinary = require('istextorbinary');
var xml2js = require('xml2js'),
    GenMyModelParser = require('./parser/genmymodel_parser'),
    SQLTypes = require('./parser/sql_types'),
    buildException = require('./parser/exception_factory').buildException,
    exceptions = require('./parser/exception_factory').exceptions;
var gutil = require('gulp-util');
var _ = require("lodash");


var TEMPLATES = {
  INTERFACE: "interface <%= interfaceName %> {\n" +
  "  <%= attributes %>" +
  "  <%= functions %>" +
  "}\n",

  INTERFACE_ATTRIBUTE: "  <%= attributeName %>: <%= attributeType %>;\n",

  INTERFACE_FUNCTION: " (<%= functionParameter %>): <%= functionReturn %>;",

  INTERFACE_FUNCTION_PARAMETER: "<%= parameterName %>: <%= parameterType %>"
};

module.exports = function(options) {
  return new Transform({
    objectMode: true,
    transform: function(file, enc, callback) {
      if (file.isNull()) {
        return callback(null, file);
      }

      function doJSON() {
        var fileContent = String(file.contents);
        var root = getRootElement(fileContent);
        var types = initDatabaseTypeHolder("sql");
        var parser = new GenMyModelParser(root, types);

        return parser.parse();
      }

      function generateInterface(interface, fields, functions) {
        var template = TEMPLATES.INTERFACE;

        var params = {
          interfaceName: interface.name,
          attributes: generateInterfaceAttributes(interface, fields),
          functions: generateInterfaceFunctions(interface, functions)
        }

        return _.template(template)(params);
      }

      function generateInterfaceAttributes(interface, fields){
        var attributes = "";

        interface.fields.forEach(function(fieldId){
          var templateFields = TEMPLATES.INTERFACE_ATTRIBUTE;

          var paramsFields = {
            attributeName: fields[fieldId].name,
            attributeType: fields[fieldId].type
          }

          attributes += _.template(templateFields)(paramsFields);
          attributes += "\n";

        });

        return attributes;
      }

      function generateInterfaceFunctions(interface, functions){
        var functionsString = "";

        interface.operations.forEach(function(operationId){
          var templateFunction = TEMPLATES.INTERFACE_FUNCTION;

          var paramsFunction = {
            functionReturn: functions[operationId].type,
            functionParameter: generateFunctionParameters(functions[operationId].parameters)
          };

          functionsString += _.template(templateFunction)(paramsFunction);
          functionsString += "\n";
        });

        return functionsString;
      }

      function generateFunctionParameters(parameters){
        var parametersString = "";

        var templateParameters = TEMPLATES.INTERFACE_FUNCTION_PARAMETER;

        parameters.forEach(function(parameter, index){
          if(index > 0){
            parametersString += ", ";
          }

          var paramsParameter = {
            parameterName: "test",
            parameterType: parameter.type
          }

          parametersString += _.template(templateParameters)(paramsParameter);
        });

        return parametersString;
      }

      var parsedData = doJSON();

      file.contents = new Buffer(JSON.stringify(parsedData));
      file.path = gutil.replaceExtension(file.path, '.json');

      

      var generatedInterfaces = "";

      for (var key in parsedData.interfaces) {
          var obj = parsedData.interfaces[key];
          
          generatedInterfaces += generateInterface(obj, parsedData.fields, parsedData.operations);
      }

      file.contents = new Buffer(generatedInterfaces);

      file.path = gutil.replaceExtension(file.path, '.ts');

      callback(null, file);
    }
  });
};

function initDatabaseTypeHolder(databaseTypeName) {
  switch (databaseTypeName) {
    case 'sql':
      return new SQLTypes();
    /*case 'mongodb':
      return new MongoDBTypes();
    case 'cassandra':
      return new CassandraTypes();*/
    default:
      throw new buildException(exceptions.WrongDatabaseType,
          'The passed database type is incorrect. '
          + "It must either be 'sql', 'mongodb', or 'cassandra'."
          + `Got '${databaseTypeName}'.`);
  }
}

function getRootElement(content) {
  var root;
  var parser = new xml2js.Parser();
  parser.parseString(content, function (err, result) {
    if (result.hasOwnProperty('uml:Model')) {
      root = result['uml:Model'];
    } else if (result.hasOwnProperty('xmi:XMI')) {
      root = result['xmi:XMI']['uml:Model'][0];
    } else {
      console.log("ERROOOOOOR")
    }
  });
  return root;
}

// function initDatabaseTypeHolder(databaseTypeName) {
//     switch (databaseTypeName) {
//       case 'sql':
//         return new SQLTypes();
//       /*case 'mongodb':
//         return new MongoDBTypes();
//       case 'cassandra':
//         return new CassandraTypes();*/
//       default:
//         throw new buildException(exceptions.WrongDatabaseType,
//             'The passed database type is incorrect. '
//             + "It must either be 'sql', 'mongodb', or 'cassandra'."
//             + `Got '${databaseTypeName}'.`);
//     }
//   }




   function getRootElement(content) {
    var root;
    var parser = new xml2js.Parser();
    parser.parseString(content, function (err, result) {
      if (result.hasOwnProperty('uml:Model')) {
        root = result['uml:Model'];
      } else if (result.hasOwnProperty('xmi:XMI')) {
        root = result['xmi:XMI']['uml:Model'][0];
      } else {
        console.log("ERROOOOOOR")
      }
    });
    return root;
  }

  const fs = require('fs');
var fileContent = fs.readFileSync("solfunmeme.xmi", 'utf-8');
  var root = getRootElement(fileContent);

  //console.log(root)

  for (const element of root.packagedElement) {
   // if (element.$.xmiType === "uml:Class") {
      console.log(element.$)
    //}
  }


//   var types = initDatabaseTypeHolder("sql");

//   var parser = new GenMyModelParser(root, types);

//   console.log(JSON.stringify(parser.parse()));



//   return JSON.stringify(parser.parse())
//     .pipe(gulp.dest('build/'))