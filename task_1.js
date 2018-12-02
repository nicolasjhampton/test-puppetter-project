module.exports = async function(page, readFile) {
  var esprima = require("./esprima.js");
  var content = await readFile('./app.js');
  var ast = esprima.parse(content);
  
  var $ = require('./astquery.js');
  var $ast = $(ast);
  
  function validator(value) {
    return value && value.is("MemberExpression") && value.is({name: "section", property: "children"});
  }
  var variableDec = $ast.hasVariableDeclaration({name: "paragraphs", value: validator}) || $ast.hasAssignmentExpression({left: "paragraphs", right: validator});
  if(variableDec) {
    return Promise.resolve(true);
  } else {
    return Promise.resolve("You didn't use the children property on the section element");
  }
};
