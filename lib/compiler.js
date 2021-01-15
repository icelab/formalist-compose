"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = compiler;

var _immutable = require("immutable");

var _formalistValidation = require("formalist-validation");

var _formalistValidation2 = _interopRequireDefault(_formalistValidation);

var _compileAttributes = require("./compile-attributes");

var _compileAttributes2 = _interopRequireDefault(_compileAttributes);

var _schemaMapping = require("./schema-mapping");

var _schemaMapping2 = _interopRequireDefault(_schemaMapping);

var _camelCase = require("./utils/camel-case");

var _camelCase2 = _interopRequireDefault(_camelCase);

var _eventTypes = require("./constants/event-types");

var _fields = require("./actions/fields");

var fieldActions = _interopRequireWildcard(_fields);

var _many = require("./actions/many");

var manyActions = _interopRequireWildcard(_many);

var _manyForms = require("./actions/many-forms");

var manyFormsActions = _interopRequireWildcard(_manyForms);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Compiler
 *
 * The compiler function consists of recursive function that traverses an AST
 * and returns the results of functions that map to each node 'type' in the
 * form configuration object.
 *
 * It keeps track of the position of each node in the AST as a `path`. Which is
 * a series of indices that correspond to the array positions.
 *
 * @param  {Store} store A Redux store containing the abstract syntax tree
 * representing the form as an Immutable List.
 *
 * @param {EventEmitter} bus A single bus for internal events within the form
 * instance.
 *
 * @param  {Object} config The configuration for each component.
 *
 * @return {Array} An array representing the compiled form.
 */
function compiler(_ref) {
  var _this9 = this;

  var store = _ref.store,
      bus = _ref.bus,
      config = _ref.config,
      pathMapping = _ref.pathMapping;

  /**
   * Called for each node in the abstract syntax tree (AST) that makes up the
   * state contained in the store. We identify the node by `type`
   *
   * @param  {ImmutableList} path A series of indices that defined the
   * contextual 'path' of a node in the AST. For example, `[0,1,0,1,1,3,0]`.
   * Stored as ImmutableList to avoid mutation issues while we recurse.
   *
   * @param  {ImmutableList} node The contextual node in the AST
   *
   * @param  {Integer} index The index of this node with respect to its siblings
   *
   * @return {Function} Result of the contextual function
   */
  var visit = function visit(_ref2) {
    var path = _ref2.path,
        namePath = _ref2.namePath,
        node = _ref2.node,
        index = _ref2.index;

    // Update the current path context
    path = path.push(index, 1);
    // Extract data from the AST based on the schema
    var type = node.get(_schemaMapping2.default.visit.type);
    var definition = node.get(_schemaMapping2.default.visit.definition);

    // Use the type to create a reference to a `visit` method
    // E.g., `field` -> `visitField(...)`
    var visitMethod = "visit" + (0, _camelCase2.default)(type, true);
    return destinations[visitMethod]({ path: path, namePath: namePath, definition: definition, index: index });
  };

  function appendNamePath(namePath, addition) {
    return namePath != null ? namePath + "." + addition : addition;
  }

  /**
   * A reference object so we can call our dynamic functions in `visit`
   * @type {Object}
   */
  var destinations = {
    /**
     * Called for each node that identifies as a field. Identifies the field
     * _type_ function from the `config`
     *
     * @param  {ImmutableList} path A series of indices that defined the
     * contextual 'path' of a node in the AST. For example, `[0,1,0,1,1,3,0]`.
     * Stored as ImmutableList to avoid mutation issues while we recurse.
     *
     * @param  {ImmutableList} definition The list that defines the data related
     * to the field.
     *
     * @param  {Integer} index The index of this node with respect to its siblings
     *
     * @return {Function} Result of the relevant `fields[type]` function
     */
    visitField: function visitField(_ref3) {
      var path = _ref3.path,
          namePath = _ref3.namePath,
          definition = _ref3.definition,
          index = _ref3.index;

      var key = path.hashCode();
      var hashCode = definition.hashCode();
      var name = definition.get(_schemaMapping2.default.field.name);
      var type = (0, _camelCase2.default)(definition.get(_schemaMapping2.default.field.type));
      var value = definition.get(_schemaMapping2.default.field.value);
      var errors = definition.get(_schemaMapping2.default.field.errors);
      var attributes = (0, _compileAttributes2.default)(definition.get(_schemaMapping2.default.field.attributes));
      namePath = appendNamePath(namePath, name);
      var Field = config.get("field", type);
      if (typeof Field !== "function") {
        throw new Error("Expected the " + type + " field handler to be a function.");
      }

      // Extract validation rules
      var validationRules = attributes.get("validation") ? attributes.get("validation").toJS() : null;

      // Create methods to pass
      // Edit field value
      var edit = function edit(val) {
        // Ensure that the value is a function
        // https://facebook.github.io/immutable-js/docs/#/updateIn
        var valFunc = typeof val === "function" ? val : function (previousValue) {
          return val;
        };

        // Curry with the form validation schema
        var validator = (0, _formalistValidation2.default)(validationRules);

        var editedValue = valFunc();
        // Ensure we're not passing Immutable stuff through
        // to the validator
        if (_immutable.List.isList(editedValue)) {
          editedValue = editedValue.toJS();
        }

        bus.emit(_eventTypes.internalEvents.FIELD_CHANGE, { namePath: namePath, value: editedValue });

        return store.batchDispatch([fieldActions.edit(path, valFunc), fieldActions.validate(path, validator(editedValue))]);
      };

      // Remove field entirely
      var remove = function remove() {
        bus.emit(_eventTypes.internalEvents.FIELD_REMOVED, { namePath: namePath });
        return store.dispatch(fieldActions.remove(path));
      };

      // Build path mapping
      pathMapping[namePath] = {
        path: path,
        edit: edit,
        remove: remove
      };

      return Field({
        key: key,
        hashCode: hashCode,
        path: path,
        namePath: namePath,
        bus: bus,
        type: type,
        name: name,
        value: value,
        errors: errors,
        attributes: attributes,
        edit: edit,
        remove: remove
      });
    },


    /**
     * Called for each node that identifies as an 'attr'. Attr is a wrapper
     * for a set of children, so it simply returns its `visit`ed children.
     *
     * @param  {ImmutableList} path A series of indices that defined the
     * contextual 'path' of a node in the AST. For example, `[0,1,0,1,1,3,0]`.
     * Stored as ImmutableList to avoid mutation issues while we recurse.
     *
     * @param  {ImmutableList} definition The list that defines the data related
     * to the attr block.
     *
     * @return {ImmutableList} A list of the attr block’s child nodes
     */
    visitAttr: function visitAttr(_ref4) {
      var _this = this;

      var path = _ref4.path,
          namePath = _ref4.namePath,
          definition = _ref4.definition;

      var key = path.hashCode();
      var hashCode = definition.hashCode();
      var name = definition.get(_schemaMapping2.default.attr.name);
      var type = definition.get(_schemaMapping2.default.attr.type);
      var errors = definition.get(_schemaMapping2.default.attr.errors);
      var attributes = (0, _compileAttributes2.default)(definition.get(_schemaMapping2.default.attr.attributes));
      var children = definition.get(_schemaMapping2.default.attr.children);
      namePath = appendNamePath(namePath, name);
      path = path.push(_schemaMapping2.default.attr.children);
      var Attr = config.get("attr");
      if (typeof Attr !== "function") {
        throw new Error("Expected the attr handler to be a function.");
      }
      return Attr({
        key: key,
        hashCode: hashCode,
        name: name,
        type: type,
        errors: errors,
        attributes: attributes,
        children: children.map(function (node, index) {
          return visit.call(_this, { path: path, namePath: namePath, node: node, index: index });
        })
      });
    },


    /**
     * Called for each node that identifies as a 'compound_field'. Compound
     * fields are essentially UI wrappers for a set of children, so it simply
     * returns its `visit`ed children.
     *
     * @param  {ImmutableList} path A series of indices that defined the
     * contextual 'path' of a node in the AST. For example, `[0,1,0,1,1,3,0]`.
     * Stored as ImmutableList to avoid mutation issues while we recurse.
     *
     * @param  {ImmutableList} definition The list that defines the data related
     * to the CompoundField block.
     *
     * @return {ImmutableList} A list of the CompoundField block’s child nodes
     */
    visitCompoundField: function visitCompoundField(_ref5) {
      var _this2 = this;

      var path = _ref5.path,
          namePath = _ref5.namePath,
          definition = _ref5.definition;

      var key = path.hashCode();
      var hashCode = definition.hashCode();
      var type = definition.get(_schemaMapping2.default.compoundField.type);
      var attributes = (0, _compileAttributes2.default)(definition.get(_schemaMapping2.default.compoundField.attributes));
      var children = definition.get(_schemaMapping2.default.compoundField.children);
      path = path.push(_schemaMapping2.default.compoundField.children);
      var CompoundField = config.get("compoundField");
      if (typeof CompoundField !== "function") {
        throw new Error("Expected the CompoundField handler to be a function.");
      }
      return CompoundField({
        key: key,
        hashCode: hashCode,
        type: type,
        attributes: attributes,
        children: children.map(function (node, index) {
          return visit.call(_this2, { path: path, namePath: namePath, node: node, index: index });
        })
      });
    },


    /**
     * Called for each node that identifies as an 'many'.
     *
     * @param  {ImmutableList} path A series of indices that defined the
     * contextual 'path' of a node in the AST. For example, `[0,1,0,1,1,3,0]`.
     * Stored as ImmutableList to avoid mutation issues while we recurse.
     *
     * @param  {ImmutableList} definition The list that defines the data related
     * to the many block.
     *
     * @return {Function} Result of the relevant many function from the config
     * (including the result of its children)
     */
    visitMany: function visitMany(_ref6) {
      var _this3 = this;

      var path = _ref6.path,
          namePath = _ref6.namePath,
          definition = _ref6.definition;

      var key = path.hashCode();
      var hashCode = definition.hashCode();
      var name = definition.get(_schemaMapping2.default.many.name);
      var type = definition.get(_schemaMapping2.default.many.type);
      var errors = definition.get(_schemaMapping2.default.many.errors);
      var attributes = (0, _compileAttributes2.default)(definition.get(_schemaMapping2.default.many.attributes));
      var template = definition.get(_schemaMapping2.default.many.template);
      var contents = definition.get(_schemaMapping2.default.many.contents);
      var contentsPath = path.push(_schemaMapping2.default.many.contents);
      namePath = appendNamePath(namePath, name);
      var children = contents.map(function (content, contentIndex) {
        return content.map(function (node, index) {
          // Build up a namePath for the children
          var childNamePath = appendNamePath(namePath, contentIndex);
          return visit.call(_this3, {
            path: contentsPath.push(contentIndex),
            namePath: childNamePath,
            node: node,
            index: index
          });
        });
      });
      var Many = config.get("many");
      if (typeof Many !== "function") {
        throw new Error("Expected the many handler to be a function.");
      }
      pathMapping[namePath] = path;

      // Extract validation rules
      var validationRules = attributes.get("validation") ? attributes.get("validation").toJS() : null;

      // Create methods to pass
      var addChild = function addChild() {
        return store.batchDispatch([manyActions.addChild(path), manyActions.validate(path, (0, _formalistValidation2.default)(validationRules))]);
      };
      var removeChild = function removeChild(index) {
        var childPath = contentsPath.push(index);

        return store.batchDispatch([manyActions.removeChild(childPath), manyActions.validate(path, (0, _formalistValidation2.default)(validationRules))]);
      };
      var reorderChildren = function reorderChildren(newOrder) {
        return store.batchDispatch([manyActions.reorderChildren(path, newOrder), manyActions.validate(path, (0, _formalistValidation2.default)(validationRules))]);
      };
      var editChildren = function editChildren(newChildren) {
        return store.batchDispatch([manyActions.editChildren(path, newChildren), manyActions.validate(path, (0, _formalistValidation2.default)(validationRules))]);
      };

      return Many({
        key: key,
        hashCode: hashCode,
        path: path,
        namePath: namePath,
        store: store,
        bus: bus,
        contentsPath: contentsPath,
        name: name,
        type: type,
        errors: errors,
        attributes: attributes,
        template: template,
        children: children,
        addChild: addChild,
        removeChild: removeChild,
        reorderChildren: reorderChildren,
        editChildren: editChildren
      });
    },


    /**
     * Called for each node that identifies as a 'manyForms'.
     *
     * @param  {ImmutableList} path A series of indices that defined the
     * contextual 'path' of a node in the AST. For example, `[0,1,0,1,1,3,0]`.
     * Stored as ImmutableList to avoid mutation issues while we recurse.
     *
     * @param  {ImmutableList} definition The list that defines the data related
     * to the manyForms block.
     *
     * @return {Function} Result of the relevant manyForms function from the config
     * (including the result of its children)
     */
    visitManyForms: function visitManyForms(_ref7) {
      var _this4 = this;

      var path = _ref7.path,
          namePath = _ref7.namePath,
          definition = _ref7.definition;

      var key = path.hashCode();
      var hashCode = definition.hashCode();
      var name = definition.get(_schemaMapping2.default.manyForms.name);
      var type = definition.get(_schemaMapping2.default.manyForms.type);
      var errors = definition.get(_schemaMapping2.default.manyForms.errors);
      var attributes = (0, _compileAttributes2.default)(definition.get(_schemaMapping2.default.manyForms.attributes));
      var contents = definition.get(_schemaMapping2.default.manyForms.contents);
      var contentsPath = path.push(_schemaMapping2.default.manyForms.contents);
      var children = contents.map(function (node, index) {
        var childNamePath = appendNamePath(namePath, index);
        return visit.call(_this4, {
          path: contentsPath,
          namePath: childNamePath,
          node: node,
          index: index
        });
      });

      var ManyForms = config.get("manyForms");
      if (typeof ManyForms !== "function") {
        throw new Error("Expected the manyForms handler to be a function.");
      }
      pathMapping[namePath] = path;

      // Extract validation rules
      var validationRules = attributes.get("validation") ? attributes.get("validation").toJS() : null;

      // Create methods to pass
      var addChild = function addChild(formName, form) {
        return store.batchDispatch([manyFormsActions.addChild(path, formName, form), manyFormsActions.validate(path, (0, _formalistValidation2.default)(validationRules))]);
      };
      var removeChild = function removeChild(index) {
        var childPath = contentsPath.push(index);

        return store.batchDispatch([manyFormsActions.removeChild(childPath), manyFormsActions.validate(path, (0, _formalistValidation2.default)(validationRules))]);
      };
      var reorderChildren = function reorderChildren(newOrder) {
        return store.batchDispatch([manyFormsActions.reorderChildren(path, newOrder), manyFormsActions.validate(path, (0, _formalistValidation2.default)(validationRules))]);
      };
      var editChildren = function editChildren(newChildren) {
        return store.batchDispatch([manyFormsActions.editChildren(path, newChildren), manyFormsActions.validate(path, (0, _formalistValidation2.default)(validationRules))]);
      };

      return ManyForms({
        key: key,
        hashCode: hashCode,
        path: path,
        namePath: namePath,
        store: store,
        bus: bus,
        contentsPath: contentsPath,
        name: name,
        type: type,
        errors: errors,
        attributes: attributes,
        children: children,
        addChild: addChild,
        removeChild: removeChild,
        reorderChildren: reorderChildren,
        editChildren: editChildren
      });
    },
    visitChildForm: function visitChildForm(_ref8) {
      var _this5 = this;

      var path = _ref8.path,
          namePath = _ref8.namePath,
          definition = _ref8.definition;

      var key = path.hashCode();
      var hashCode = definition.hashCode();
      var type = definition.get(_schemaMapping2.default.childForm.type);
      var name = definition.get(_schemaMapping2.default.childForm.name);
      var attributes = (0, _compileAttributes2.default)(definition.get(_schemaMapping2.default.childForm.attributes));
      var children = definition.get(_schemaMapping2.default.childForm.children);
      namePath = appendNamePath(namePath, name);
      path = path.push(_schemaMapping2.default.childForm.children);
      var ChildForm = config.get("childForm");
      if (typeof ChildForm !== "function") {
        throw new Error("Expected the ChildForm handler to be a function.");
      }
      return ChildForm({
        key: key,
        hashCode: hashCode,
        name: name,
        type: type,
        attributes: attributes,
        children: children.map(function (node, index) {
          return visit.call(_this5, { path: path, namePath: namePath, node: node, index: index });
        })
      });
    },
    visitFormField: function visitFormField(_ref9) {
      var _this6 = this;

      var path = _ref9.path,
          namePath = _ref9.namePath,
          definition = _ref9.definition;

      var key = path.hashCode();
      var hashCode = definition.hashCode();
      var type = definition.get(_schemaMapping2.default.formField.type);
      var name = definition.get(_schemaMapping2.default.formField.name);
      var attributes = (0, _compileAttributes2.default)(definition.get(_schemaMapping2.default.formField.attributes));
      var children = definition.get(_schemaMapping2.default.formField.children);
      path = path.push(_schemaMapping2.default.formField.children);
      var FormField = config.get("formField");
      if (typeof FormField !== "function") {
        throw new Error("Expected the FormField handler to be a function.");
      }
      return FormField({
        key: key,
        hashCode: hashCode,
        name: name,
        type: type,
        attributes: attributes,
        children: children.map(function (node, index) {
          return visit.call(_this6, { path: path, namePath: namePath, node: node, index: index });
        })
      });
    },


    /**
     * Called for each node that identifies as an 'section'. Sections are
     * thought of as strong top-level (though they can be nested) wrappers for
     * other nodes.
     *
     * @param  {ImmutableList} path A series of indices that defined the
     * contextual 'path' of a node in the AST. For example, `[0,1,0,1,1,3,0]`.
     * Stored as ImmutableList to avoid mutation issues while we recurse.
     *
     * @param  {ImmutableList} definition The list that defines the data related
     * to the section block.
     *
     * @return {Function} Result of the relevant section function from the
     * config (including the result of its children)
     */
    visitSection: function visitSection(_ref10) {
      var _this7 = this;

      var path = _ref10.path,
          namePath = _ref10.namePath,
          definition = _ref10.definition;

      var key = path.hashCode();
      var hashCode = definition.hashCode();
      // Sections have name attrs but it doesn't affect the namePath
      var name = definition.get(_schemaMapping2.default.section.name);
      var type = definition.get(_schemaMapping2.default.section.type);
      var attributes = (0, _compileAttributes2.default)(definition.get(_schemaMapping2.default.section.attributes));
      var children = definition.get(_schemaMapping2.default.section.children);
      path = path.push(_schemaMapping2.default.section.children);
      if (!children) return;
      var Section = config.get("section");
      if (typeof Section !== "function") {
        throw new Error("Expected the section handler to be a function.");
      }
      return Section({
        key: key,
        hashCode: hashCode,
        name: name,
        type: type,
        attributes: attributes,
        children: children.map(function (node, index) {
          return visit.call(_this7, { path: path, namePath: namePath, node: node, index: index });
        })
      });
    },


    /**
     * Called for each node that identifies as an 'group'. Group are
     * thought of as light-weight groupings for other nodes.
     *
     * @param  {ImmutableList} path A series of indices that defined the
     * contextual 'path' of a node in the AST. For example, `[0,1,0,1,1,3,0]`.
     * Stored as ImmutableList to avoid mutation issues while we recurse.
     *
     * @param  {ImmutableList} definition The list that defines the data related
     * to the group block.
     *
     * @return {Function} Result of the relevant group function from the
     * config (including the result of its children)
     */
    visitGroup: function visitGroup(_ref11) {
      var _this8 = this;

      var path = _ref11.path,
          namePath = _ref11.namePath,
          definition = _ref11.definition;

      var key = path.hashCode();
      var hashCode = definition.hashCode();
      var type = definition.get(_schemaMapping2.default.group.type);
      var attributes = (0, _compileAttributes2.default)(definition.get(_schemaMapping2.default.group.attributes));
      var children = definition.get(_schemaMapping2.default.group.children);
      path = path.push(_schemaMapping2.default.group.children);
      if (!children) return;
      var Group = config.get("group");
      if (typeof Group !== "function") {
        throw new Error("Expected the group handler to be a function.");
      }
      return Group({
        key: key,
        hashCode: hashCode,
        type: type,
        attributes: attributes,
        children: children.map(function (node, index) {
          return visit.call(_this8, { path: path, namePath: namePath, node: node, index: index });
        })
      });
    }
  };

  // Map over the root nodes
  // We pass in an empty Immutable.List as `path` to kick things off
  var list = store.getState();
  return _immutable.List.isList(list) ? list.map(function (node, index) {
    return visit.call(_this9, { path: (0, _immutable.List)(), node: node, index: index });
  }) : false;
}