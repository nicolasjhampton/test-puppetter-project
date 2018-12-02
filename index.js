const {promisify} = require('util');
const _fs = require('fs');
const readFile = promisify(_fs.readFile);
var puppeteer = require("puppeteer-core");

const chromium = JSON.parse(process.env.CODE_CHALLENGE_CHROMIUM_CONFIG);

(async function() {
  const browser = await puppeteer.launch(chromium);
  const page_init = await browser.newPage();
  const html = await readFile("./hidden-index.html", {encoding: 'utf-8'});
  const response = await page_init.goto("data:text/html," + html)
  
  if(response.ok()) {
    const up_to = parseInt(process.env.CODE_CHALLENGE_TASK_NUMBER, 10);
    for(let i = 1; i <= up_to; i++) {
      let task = require(`./task_${i}.js`);
      let result = await task(page_init, readFile);
      if (result === true) {
        console.log(`[[CCENGINE ${process.env.CODE_CHALLENGE_EXECUTION_ID} pass: ${i} ]]`);
      } else {
        console.log(`[[CCENGINE ${process.env.CODE_CHALLENGE_EXECUTION_ID} fail: ${i} : ${result} ]]`);
      }
    }
  }
  
  browser.close();
})()