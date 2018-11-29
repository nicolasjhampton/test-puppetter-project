var TestCase, page;

TestCase = (function() {

  TestCase.name = 'TestCase';

  function TestCase(page, index) {
    var result;
    this.page = page;
    this.index = index;
    result = this.run();
    if (result === true) {
      this.pass();
    } else {
      this.fail(result);
    }
  }

  TestCase.prototype.pass = function() {
    return console.log("[[CCENGINE <%= execution_id %> pass:" + this.index + "]]");
  };

  TestCase.prototype.fail = function(hint) {
    return console.log("[[CCENGINE <%= execution_id %> fail:" + this.index + ":" + hint + "]]");
  };

  TestCase.prototype.source = "./hidden-index.html"  // <%= file_contents.to_json %>; // 

  TestCase.prototype.ast = function(source_string) {
    var esprima = require("./esprima.js");  // "<%= PhantomjsRunner::ESPRIMA_INCLUDE_PATH %>"
    return esprima.parse(source_string);
  }

  TestCase.prototype.injectJquery = function() {
    this.page.injectJs("<%= PhantomjsRunner::JQUERY_INCLUDE_PATH %>");
  };

  return TestCase;

})();

var _fs = require('fs');
var html = _fs.readFileSync("./hidden-index.html", {encoding: 'utf-8'});


var puppeteer = require("puppeteer");

puppeteer.launch().then(function(browser) {
  browser.newPage().then(function(page_init) {
    return page_init.goto("data:text/html," + html).then(function(response) {
      if(response.ok()) {

        TestCase.prototype.run = function() {
          var fs = require('fs');
          var file = fs.openSync('./app.js', 'r');
          var content = fs.readFileSync(file);
          var ast = this.ast(content);
          //file.close();
          
          var $ = require('./astquery.js');
          var $ast = $(ast);
          
          function validator(value) {
            return value && value.is("MemberExpression") && value.is({name: "section", property: "children"});
          }
          var variableDec = $ast.hasVariableDeclaration({name: "paragraphs", value: validator}) || $ast.hasAssignmentExpression({left: "paragraphs", right: validator});
          if(variableDec) {
            return true;
          } else {
            return "You didn't use the children property on the section element";
          }
        };

        new TestCase(page, 1);
      }
    });
  }).then(function() {
    browser.close();
  });
});