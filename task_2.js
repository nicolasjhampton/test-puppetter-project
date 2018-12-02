module.exports = async function(page, readFile) {
    var esprima = require("./esprima.js");
    var content = await readFile('./app.js');
    var ast = esprima.parse(content);

    var $ = require('./astquery.js');
    var $ast = $(ast);

    var styleCalledOnCollection = $ast.hasAssignmentExpression({left: function(memberExperssion) {
        return memberExperssion.is("MemberExpression", { name: function(memberExperssion) {
                return memberExperssion.is("MemberExpression", {name: "paragraphs", property: "style"});
            }, property: "color"})
        }
    });

    if(styleCalledOnCollection) {
        return "You can't set the style of a collection of paragraph element. You'll need to set each element's style individually.";
    } else {
       
        await page.evaluate(`${content}`);
        const allBlue = await page.evaluate(() => {
            return [].slice.call(paragraphs).every((el) => {
                return window.getComputedStyle(el).color === "rgb(0, 0, 255)"
            });
        })

        // await page.evaluate(`
        // var ps = [].slice.call(paragraphs);
        // var allBlue = ps.every(function(el) {
        //     return window.getComputedStyle(el).color === "rgb(0, 0, 255)";
        // });
        // window.allBlue = allBlue`);
        // const allBlue = await page.evaluate(() => window.allBlue);
        // console.log(allBlue);
        if(allBlue) {
            return Promise.resolve(true);
        } else {
            return Promise.resolve("Not all of the paragraphs text colors have been changed to blue progamatically");
        }
    }
}
