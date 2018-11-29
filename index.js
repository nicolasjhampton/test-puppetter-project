var puppeteer = require("puppeteer");

puppeteer.launch().then(function(browser) {
  browser.newPage().then(function(page) {
    return page.goto("https://www.google.com").then(function(response) {
      if(response.ok()) {
        
      }
    });
  }).then(function() {
    browser.close();
  });
});