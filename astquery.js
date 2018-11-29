var ASTQuery = {
    init: function(ast) {
        //Prepare objects with computed methods;
        this.prepareASTNodeList();
        this.prepareASTBlockExpressions();
        this.prepareASTBinaryExpression();
        this.walk(ast);
        return ast.body;
    },
    prepareASTNodeList: function() {
        Object.keys(ASTQuery.Types.esprima).forEach(function(type) {
            var hasMethod = "has" + type;
            if(!ASTQuery.Types.internal.NodeList.hasOwnProperty(hasMethod)) {
                ASTQuery.Types.internal.NodeList[hasMethod] = function hasType(options) {
                    return this.has(type, options);
                }
            }
        });
    },
    prepareASTBlockExpressions: function() {
        Object.keys(ASTQuery.Types.internal.NodeList).forEach(function(method) {
            [ASTQuery.Types.esprima.CatchClause, ASTQuery.Types.esprima.FunctionExpression, ASTQuery.Types.esprima.FunctionDeclaration, ASTQuery.Types.esprima.TryStatement].forEach(function(object){
                if(!object.hasOwnProperty(method)) {
                    object[method] = function traverseToBody() {
                        return this.blockRoot().body[method](arguments[0], arguments[1]);
                    }
                }
            });
        });
    },
    prepareASTBinaryExpression: function() {
        var AssignmentExpression = ASTQuery.Types.esprima.AssignmentExpression,
            BinaryExpression = ASTQuery.Types.esprima.BinaryExpression;
        Object.keys(AssignmentExpression).forEach(function(method){
            if(!BinaryExpression.hasOwnProperty(method)) {
                if(typeof AssignmentExpression[method] === "function") {
                    BinaryExpression[method] = AssignmentExpression[method];
                }
            }
        });
    },
    /***
     * Walks the AST to bind methods to objects and arrays
     * @param ast
     */
    walk: function(ast) {
        for(var key in ast){
            if(ast.hasOwnProperty(key)) {
                var value = ast[key];
                if(Array.isArray(value)){
                    value.forEach(ASTQuery.Util.bindNodeMethods);
                    ASTQuery.Util.bind(ASTQuery.Types.internal.NodeList, value);

                    value.filter(function(obj){
                        return !Array.isArray(obj) && typeof obj === "object" && Boolean(obj);
                    }).forEach(ASTQuery.walk);
                } else if(typeof value === "object" && Boolean(value)) {
                    ASTQuery.Util.bindNodeMethods(value);
                    ASTQuery.walk(value);
                }
            }
        }
    },
    Util: {
        /***
         * Binds all methods from one object to another
         * @param from is the object with the desired methods
         * @param to is the object that requires additional methods
         */
        bind: function(from, to) {
            Object.keys(from).forEach(function(method){
                to[method] = from[method];
            });
        },
        /***
         * Attaches helper methods to the statements for helping querying.
         * @param astNode is the node to attach methods to
         */
        bindNodeMethods: function(astNode) {
            /** Needed to build rest of methods on objects **/
            ASTQuery.Util.bind(ASTQuery.Types.internal.Node, astNode);

            var objects = [];


            Object.keys(ASTQuery.Types.esprima).forEach(function(type){
                if(astNode.is(type)){
                    objects.push(ASTQuery.Types.esprima[type]);
                }
            });
    
            var requiresArgumentHelpder = astNode.is("FunctionExpression") || astNode.is("FunctionDeclaration") || astNode.is("CallExpression");

            if(requiresArgumentHelpder) objects.push(ASTQuery.Types.internal.ArgumentHelper);
            
            objects.filter(function(object){
                return Boolean(object);
            }).forEach(function(object){
                ASTQuery.Util.bind(object, astNode);
            });
        }
    },
    Types: {
        internal: {
            Node: {
                expressionRoot: function() {
                    return this.type === "ExpressionStatement" ? this.expression : this;
                },
                validatesOptions: function(options) {
                    (this.REQUIRED_OPTIONS || []).forEach(function (validator) {
                        if (typeof options[validator[0]] === "undefined") {
                            throw "'" + validator[0] + "' " + validator[1];
                        }
                    })
                },
                is: function(type, options) {
                    if(typeof options === "undefined") {
                        if(typeof type === "object") {
                            return this.validateOnOptions(type);
                        } else {
                            return this.isType(type);
                        }
                    } else {
                        return this.is(type) && this.validateOnOptions(options);
                    }
                },
                isType: function (type) {
                    return this.expressionRoot().type === type;
                },
                validateOnOptions: function(options ){
                    this.validatesOptions(options);
                    return this.validate(options);
                }
            },
            NodeList: {
                has: function(type, options) {
                    return this.find(type, options).length > 0;
                },
                find: function(type, options) {
                    if(Object.keys(ASTQuery.Types.esprima).indexOf(type) < 0) {
                        throw "Invalid statement type";
                    } else {
                        var foundStatements = this.filter(function(statement){
                            if(options === undefined) {
                                return statement.is(type);
                            } else {
                                return statement.is(type) && statement.is(options);
                            }
                        });
                        ASTQuery.Util.bind(ASTQuery.Types.internal.NodeList, foundStatements);
                        return foundStatements;
                    }
                },
                findFirst: function(type, options) {
                    return this.find(type, options)[0];
                }
            },
            ArgumentHelper: {
                hasValidArguments: function(args) {
                    if(typeof args === "function") {
                        return this.applyArgumentValidator(args);
                    } else {
                        return this.hasNamedArguments(args);
                    }
                },
                hasNamedArguments: function(args) {
                    return Array.isArray(args) && this.argumentNames().join(",") === args.join(",");
                },
                argumentNames: function() {
                    return this.rawArguments().map(function(arg){
                        return arg["name"];
                    });
                },
                applyArgumentValidator: function(validator) {
                    return validator.call(this, this.rawArguments());
                }
            }
        },
        esprima: {
            MemberExpression: {
                hasObject: function(objectName) {
                    if(typeof objectName === 'function') {
                        return objectName(this.expressionRoot().object);
                    } else {
                        return this.expressionRoot().object && this.expressionRoot().object.name === objectName;
                    }
                },
                hasProperty: function(propertyName) {
                    return this.expressionRoot().property && this.expressionRoot().property.name === propertyName;
                },
                isThis: function() {
                    return this.expressionRoot().object && this.expressionRoot().object.is("ThisExpression");
                },
                validate: function(options) {
                    if(options.name === "this") {
                        return this.isThis() && this.hasProperty(options.property);
                    } else {
                        return this.hasObject(options.name) && this.hasProperty(options.property);
                    }
                }
            },
            CallExpression: {
                REQUIRED_OPTIONS: [["name",  "required for object name or function name"]],
                hasObjectOrFunction: function(objectOrFunctionName) {
                    return (this.expressionRoot().callee.name || this.expressionRoot().callee.object.name) === objectOrFunctionName;

                },
                hasMethod: function(methodName){
                    return this.expressionRoot().callee.property && this.expressionRoot().callee.property.name === methodName;
                },
                rawArguments: function(){
                    return this.expressionRoot().arguments;
                },
                isFunctionCall: function() {
                    return !this.isMethodCall();
                },
                isMethodCall: function() {
                    return typeof this.expressionRoot().callee.name === "undefined";
                },
                validate: function(options) {
                    if (options.arguments) {
                        return this.hasValidArguments(options.arguments) && this.hasObjectOrFunction(options.name) && (this.isFunctionCall() || this.hasMethod(options.method));
                    } else if (options.method) {
                        return  this.hasMethod(options.method) && this.hasObjectOrFunction(options.name);
                    } else {
                        return this.hasObjectOrFunction(options.name);
                    }
                }
            },
            FunctionExpression: {
                rawArguments: function(){
                    return this.params;
                },
                blockRoot: function() {
                    return this.body;
                }
            },
            FunctionDeclaration: {
                rawArguments: function(){
                    return this.params;
                },
                blockRoot: function() {
                    return this.body;
                },
                validate: function(options) {
                    var hasValidArguments = true;

                    if(typeof options.arguments !== "undefined") {
                       hasValidArguments = this.hasValidArguments(options.arguments);
                    }

                    if(typeof options.name !== "undefined") {
                        return this.expressionRoot().id.name === options.name && hasValidArguments;
                    } else {
                        return hasValidArguments;
                    }
                }
            },
            VariableDeclaration: {
                REQUIRED_OPTIONS: [["name",  "required for variable declaration needed"]],
                validate: function(options) {
                    var validatorReturn;
                    if(typeof options.value === "function") {
                        validatorReturn = options.value.call(this, this.declarations[0].init);
                    } else {
                        validatorReturn = true;
                    }
                    return this.declarations[0].id.name === options.name && validatorReturn;
                }
            },
            AssignmentExpression: {
                REQUIRED_OPTIONS: [
                    ["left",  "is required for left hand side of assignment expression"]
                ],
                validateOperator: function (operator) {
                    return operator === this.expressionRoot().operator || !Boolean(operator);
                },
                validateSide: function(raw, side) {
                    if(typeof side === "function") {
                        return side.call(this, raw);
                    } else {
                        return raw.name === side;
                    }
                },
                validate: function(options) {
                    return this.validateSide(this.expressionRoot().left, options.left) && this.validateSide(this.expressionRoot().right, options.right) && this.validateOperator(options.operator);
                }

            },
            BinaryExpression: {
                //Same validators as AssignmentExpression.
            },
            TryStatement: {
                blockRoot: function(){
                    return this.block;
                },
                catchClause: function(){
                    return this.handlers[0];
                }
            },
            CatchClause: {
                blockRoot: function(){
                    return this.body;
                },
                validateParam: function(param) {
                    return !Boolean(param) || this.param.name === param;
                },
                validate: function(options) {
                    return this.validateParam(options.param);
                }
            },
            Identifier: {
                REQUIRED_OPTIONS: [["identifier",  "required for variable declaration needed"]],
                validate: function(options){
                    return this.expressionRoot().name === options.identifier;
                }
            },
            WhileStatement: {
                validateTest: function(testValidator){
                    if(typeof testValidator === "function") {
                       return testValidator.call(this, this.test);
                    } else {
                        return this.test.is({identifier: testValidator})
                    }
                },
                validate: function(options) {
                    return this.validateTest(options.test);
                }
            },
            Literal: {
                validate: function(options) {
                    return this.value === options.value;
                }
            }
        }
    }
};

module.exports = function(ast) {
    return ASTQuery.init(ast);
};