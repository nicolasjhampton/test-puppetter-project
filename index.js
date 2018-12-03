const readFile = require('util').promisify(require('fs').readFile);
const path = require('path');
const puppeteer = require("puppeteer-core");
const esprima = require("./esprima.js");
const Mocha = require('mocha');
const assert = require('assert');
const $ = require('./astquery.js');


const chromium = JSON.parse(process.env.CODE_CHALLENGE_CHROMIUM_CONFIG);
const go_to = parseInt(process.env.CODE_CHALLENGE_TASK_NUMBER, 10)
let current_task_num = 0;

const mocha = new Mocha({
  "reporter": function (runner) {
    runner.on('pass', function(test) {
      console.log(`[[CCENGINE ${process.env.CODE_CHALLENGE_EXECUTION_ID} pass: ${current_task_num} ]]`)
    });
  
    runner.on('fail', function(test, err) {
      console.log(`[[CCENGINE ${process.env.CODE_CHALLENGE_EXECUTION_ID} fail: ${current_task_num} : ${err.message} ]]`);
    });
  }
}).globals([
  'assert', 'page', 'content', '$ast'
]);

function RunTests(browser) {
  for(var i = 1; i <= go_to; i++) {
    mocha.addFile(path.join(__dirname, `./task_${i}.js`));
  }
  mocha.run(function() {
    browser.close();
    process.exit(0);
  }).on('suite', function() {
    current_task_num++ // for reporter
  })
}

(async function() {
  const browser = await puppeteer.launch(chromium);
  global.page = await browser.newPage();
  global.content = await readFile('./app.js');
  global.$ast = $(esprima.parse(content));
  global.assert = assert;

  const html = await readFile("./hidden-index.html", {encoding: 'utf-8'});
  const response = await page.goto(`data:text/html,${html}`)
  
  if(response.ok()) {
    RunTests(browser);
  }
})();
