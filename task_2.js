describe("task_2.js", function () {

  it("should be true", async function () {
    var styleCalledOnCollection = $ast.hasAssignmentExpression({
      left: function (memberExperssion) {
        return memberExperssion.is("MemberExpression", {
          name: function (memberExperssion) {
            return memberExperssion.is("MemberExpression", { name: "paragraphs", property: "style" });
          }, property: "color"
        })
      }
    });
    assert.ok(!styleCalledOnCollection, "You can't set the style of a collection of paragraph element. You'll need to set each element's style individually.");
  })

  it("should be true", async function () {
    try {
      await page.evaluate(`${content}`);
    } catch (e) {
      assert.ok(false, "Your code did not compile, try again!")
    }
  });

  it("should be true", async function () {
    const allBlue = await page.evaluate(() => {
      return [].slice.call(paragraphs).every((el) => {
        return window.getComputedStyle(el).color === "rgb(0, 0, 255)"
      });
    });
    assert.ok(allBlue, "What does this error mean?")
  });

});
