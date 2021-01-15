import { List } from "immutable";
import validation from "formalist-validation";
import compileAttributes from "./compile-attributes";
import schemaMapping from "./schema-mapping";
import camelCase from "./utils/camel-case";
import { internalEvents } from "./constants/event-types";
import * as fieldActions from "./actions/fields";
import * as manyActions from "./actions/many";
import * as manyFormsActions from "./actions/many-forms";

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
export default function compiler({ store, bus, config, pathMapping }) {
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
  const visit = ({ path, namePath, node, index }) => {
    // Update the current path context
    path = path.push(index, 1);
    // Extract data from the AST based on the schema
    var type = node.get(schemaMapping.visit.type);
    var definition = node.get(schemaMapping.visit.definition);

    // Use the type to create a reference to a `visit` method
    // E.g., `field` -> `visitField(...)`
    var visitMethod = "visit" + camelCase(type, true);
    return destinations[visitMethod]({ path, namePath, definition, index });
  };

  function appendNamePath(namePath, addition) {
    return namePath != null ? `${namePath}.${addition}` : addition;
  }

  /**
   * A reference object so we can call our dynamic functions in `visit`
   * @type {Object}
   */
  const destinations = {
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
    visitField({ path, namePath, definition, index }) {
      let key = path.hashCode();
      let hashCode = definition.hashCode();
      let name = definition.get(schemaMapping.field.name);
      let type = camelCase(definition.get(schemaMapping.field.type));
      let value = definition.get(schemaMapping.field.value);
      let errors = definition.get(schemaMapping.field.errors);
      let attributes = compileAttributes(
        definition.get(schemaMapping.field.attributes)
      );
      namePath = appendNamePath(namePath, name);
      let Field = config.get("field", type);
      if (typeof Field !== "function") {
        throw new Error(`Expected the ${type} field handler to be a function.`);
      }

      // Extract validation rules
      const validationRules = attributes.get("validation")
        ? attributes.get("validation").toJS()
        : null;

      // Create methods to pass
      // Edit field value
      const edit = (val) => {
        // Ensure that the value is a function
        // https://facebook.github.io/immutable-js/docs/#/updateIn
        const valFunc =
          typeof val === "function" ? val : (previousValue) => val;

        // Curry with the form validation schema
        let validator = validation(validationRules);

        let editedValue = valFunc();
        // Ensure we're not passing Immutable stuff through
        // to the validator
        if (List.isList(editedValue)) {
          editedValue = editedValue.toJS();
        }

        bus.emit(internalEvents.FIELD_CHANGE, { namePath, value: editedValue });

        return store.batchDispatch([
          fieldActions.edit(path, valFunc),
          fieldActions.validate(path, validator(editedValue)),
        ]);
      };

      // Remove field entirely
      const remove = () => {
        bus.emit(internalEvents.FIELD_REMOVED, { namePath });
        return store.dispatch(fieldActions.remove(path));
      };

      // Build path mapping
      pathMapping[namePath] = {
        path,
        edit,
        remove,
      };

      return Field({
        key,
        hashCode,
        path,
        namePath,
        bus,
        type,
        name,
        value,
        errors,
        attributes,
        edit,
        remove,
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
    visitAttr({ path, namePath, definition }) {
      let key = path.hashCode();
      let hashCode = definition.hashCode();
      let name = definition.get(schemaMapping.attr.name);
      let type = definition.get(schemaMapping.attr.type);
      let errors = definition.get(schemaMapping.attr.errors);
      let attributes = compileAttributes(
        definition.get(schemaMapping.attr.attributes)
      );
      let children = definition.get(schemaMapping.attr.children);
      namePath = appendNamePath(namePath, name);
      path = path.push(schemaMapping.attr.children);
      let Attr = config.get("attr");
      if (typeof Attr !== "function") {
        throw new Error("Expected the attr handler to be a function.");
      }
      return Attr({
        key,
        hashCode,
        name,
        type,
        errors,
        attributes,
        children: children.map((node, index) =>
          visit.call(this, { path, namePath, node, index })
        ),
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
    visitCompoundField({ path, namePath, definition }) {
      let key = path.hashCode();
      let hashCode = definition.hashCode();
      let type = definition.get(schemaMapping.compoundField.type);
      let attributes = compileAttributes(
        definition.get(schemaMapping.compoundField.attributes)
      );
      let children = definition.get(schemaMapping.compoundField.children);
      path = path.push(schemaMapping.compoundField.children);
      let CompoundField = config.get("compoundField");
      if (typeof CompoundField !== "function") {
        throw new Error("Expected the CompoundField handler to be a function.");
      }
      return CompoundField({
        key,
        hashCode,
        type,
        attributes,
        children: children.map((node, index) =>
          visit.call(this, { path, namePath, node, index })
        ),
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
    visitMany({ path, namePath, definition }) {
      let key = path.hashCode();
      let hashCode = definition.hashCode();
      let name = definition.get(schemaMapping.many.name);
      let type = definition.get(schemaMapping.many.type);
      let errors = definition.get(schemaMapping.many.errors);
      let attributes = compileAttributes(
        definition.get(schemaMapping.many.attributes)
      );
      let template = definition.get(schemaMapping.many.template);
      let contents = definition.get(schemaMapping.many.contents);
      let contentsPath = path.push(schemaMapping.many.contents);
      namePath = appendNamePath(namePath, name);
      let children = contents.map((content, contentIndex) => {
        return content.map((node, index) => {
          // Build up a namePath for the children
          let childNamePath = appendNamePath(namePath, contentIndex);
          return visit.call(this, {
            path: contentsPath.push(contentIndex),
            namePath: childNamePath,
            node,
            index,
          });
        });
      });
      let Many = config.get("many");
      if (typeof Many !== "function") {
        throw new Error("Expected the many handler to be a function.");
      }
      pathMapping[namePath] = path;

      // Extract validation rules
      const validationRules = attributes.get("validation")
        ? attributes.get("validation").toJS()
        : null;

      // Create methods to pass
      const addChild = () => {
        return store.batchDispatch([
          manyActions.addChild(path),
          manyActions.validate(path, validation(validationRules)),
        ]);
      };
      const removeChild = (index) => {
        let childPath = contentsPath.push(index);

        return store.batchDispatch([
          manyActions.removeChild(childPath),
          manyActions.validate(path, validation(validationRules)),
        ]);
      };
      const reorderChildren = (newOrder) => {
        return store.batchDispatch([
          manyActions.reorderChildren(path, newOrder),
          manyActions.validate(path, validation(validationRules)),
        ]);
      };
      const editChildren = (newChildren) => {
        return store.batchDispatch([
          manyActions.editChildren(path, newChildren),
          manyActions.validate(path, validation(validationRules)),
        ]);
      };

      return Many({
        key,
        hashCode,
        path,
        namePath,
        store,
        bus,
        contentsPath,
        name,
        type,
        errors,
        attributes,
        template,
        children,
        addChild,
        removeChild,
        reorderChildren,
        editChildren,
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
    visitManyForms({ path, namePath, definition }) {
      let key = path.hashCode();
      let hashCode = definition.hashCode();
      let name = definition.get(schemaMapping.manyForms.name);
      let type = definition.get(schemaMapping.manyForms.type);
      let errors = definition.get(schemaMapping.manyForms.errors);
      let attributes = compileAttributes(
        definition.get(schemaMapping.manyForms.attributes)
      );
      let contents = definition.get(schemaMapping.manyForms.contents);
      let contentsPath = path.push(schemaMapping.manyForms.contents);
      let children = contents.map((node, index) => {
        let childNamePath = appendNamePath(namePath, index);
        return visit.call(this, {
          path: contentsPath,
          namePath: childNamePath,
          node,
          index,
        });
      });

      let ManyForms = config.get("manyForms");
      if (typeof ManyForms !== "function") {
        throw new Error("Expected the manyForms handler to be a function.");
      }
      pathMapping[namePath] = path;

      // Extract validation rules
      const validationRules = attributes.get("validation")
        ? attributes.get("validation").toJS()
        : null;

      // Create methods to pass
      const addChild = (formName, form) => {
        return store.batchDispatch([
          manyFormsActions.addChild(path, formName, form),
          manyFormsActions.validate(path, validation(validationRules)),
        ]);
      };
      const removeChild = (index) => {
        let childPath = contentsPath.push(index);

        return store.batchDispatch([
          manyFormsActions.removeChild(childPath),
          manyFormsActions.validate(path, validation(validationRules)),
        ]);
      };
      const reorderChildren = (newOrder) => {
        return store.batchDispatch([
          manyFormsActions.reorderChildren(path, newOrder),
          manyFormsActions.validate(path, validation(validationRules)),
        ]);
      };
      const editChildren = (newChildren) => {
        return store.batchDispatch([
          manyFormsActions.editChildren(path, newChildren),
          manyFormsActions.validate(path, validation(validationRules)),
        ]);
      };

      return ManyForms({
        key,
        hashCode,
        path,
        namePath,
        store,
        bus,
        contentsPath,
        name,
        type,
        errors,
        attributes,
        children,
        addChild,
        removeChild,
        reorderChildren,
        editChildren,
      });
    },

    visitChildForm({ path, namePath, definition }) {
      let key = path.hashCode();
      let hashCode = definition.hashCode();
      let type = definition.get(schemaMapping.childForm.type);
      let name = definition.get(schemaMapping.childForm.name);
      let attributes = compileAttributes(
        definition.get(schemaMapping.childForm.attributes)
      );
      let children = definition.get(schemaMapping.childForm.children);
      namePath = appendNamePath(namePath, name);
      path = path.push(schemaMapping.childForm.children);
      let ChildForm = config.get("childForm");
      if (typeof ChildForm !== "function") {
        throw new Error("Expected the ChildForm handler to be a function.");
      }
      return ChildForm({
        key,
        hashCode,
        name,
        type,
        attributes,
        children: children.map((node, index) =>
          visit.call(this, { path, namePath, node, index })
        ),
      });
    },

    visitFormField({ path, namePath, definition }) {
      let key = path.hashCode();
      let hashCode = definition.hashCode();
      let type = definition.get(schemaMapping.formField.type);
      let name = definition.get(schemaMapping.formField.name);
      let attributes = compileAttributes(
        definition.get(schemaMapping.formField.attributes)
      );
      let children = definition.get(schemaMapping.formField.children);
      path = path.push(schemaMapping.formField.children);
      let FormField = config.get("formField");
      if (typeof FormField !== "function") {
        throw new Error("Expected the FormField handler to be a function.");
      }
      return FormField({
        key,
        hashCode,
        name,
        type,
        attributes,
        children: children.map((node, index) =>
          visit.call(this, { path, namePath, node, index })
        ),
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
    visitSection({ path, namePath, definition }) {
      let key = path.hashCode();
      let hashCode = definition.hashCode();
      // Sections have name attrs but it doesn't affect the namePath
      let name = definition.get(schemaMapping.section.name);
      let type = definition.get(schemaMapping.section.type);
      let attributes = compileAttributes(
        definition.get(schemaMapping.section.attributes)
      );
      let children = definition.get(schemaMapping.section.children);
      path = path.push(schemaMapping.section.children);
      if (!children) return;
      let Section = config.get("section");
      if (typeof Section !== "function") {
        throw new Error("Expected the section handler to be a function.");
      }
      return Section({
        key,
        hashCode,
        name,
        type,
        attributes,
        children: children.map((node, index) =>
          visit.call(this, { path, namePath, node, index })
        ),
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
    visitGroup({ path, namePath, definition }) {
      let key = path.hashCode();
      let hashCode = definition.hashCode();
      let type = definition.get(schemaMapping.group.type);
      let attributes = compileAttributes(
        definition.get(schemaMapping.group.attributes)
      );
      let children = definition.get(schemaMapping.group.children);
      path = path.push(schemaMapping.group.children);
      if (!children) return;
      let Group = config.get("group");
      if (typeof Group !== "function") {
        throw new Error("Expected the group handler to be a function.");
      }
      return Group({
        key,
        hashCode,
        type,
        attributes,
        children: children.map((node, index) =>
          visit.call(this, { path, namePath, node, index })
        ),
      });
    },
  };

  // Map over the root nodes
  // We pass in an empty Immutable.List as `path` to kick things off
  let list = store.getState();
  return List.isList(list)
    ? list.map((node, index) => visit.call(this, { path: List(), node, index }))
    : false;
}
