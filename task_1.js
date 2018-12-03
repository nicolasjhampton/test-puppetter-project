describe("task_1.js", function () {
  it("should be true", async function () {
    function validator(value) {
      return value && value.is("MemberExpression") && value.is({ name: "section", property: "children" });
    }

    const declaration = $ast.hasVariableDeclaration({ name: "paragraphs", value: validator })
    const assignment = $ast.hasAssignmentExpression({ left: "paragraphs", right: validator })
    const result = declaration || assignment;

    assert.ok(result, "What does this error mean?");
  });
});
