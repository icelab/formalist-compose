import Immutable from "immutable";
import schemaMapping from "./schema-mapping";
import * as types from "./constants/action-types";

/**
 * TODO: Very much a WIP
 * A reducer for use alongside the Redux store for a Formalist AST.
 *
 * Handles the common actions
 *
 * @param  {ImmutableList} state The state of the form as returned by Redux.
 * The state is expected to be a `List` in Immutable.js
 *
 * @param  {Object} action A redux-compatible action.
 *
 * @return {ImmutableList} The modified state.
 */
export default function reducer(state, action) {
  switch (action.type) {
    case types.REMOVE_FIELD: {
      return state.deleteIn(action.path);
    }

    case types.EDIT_FIELD: {
      let valuePath = action.path.concat([schemaMapping.field.value]);
      return state.updateIn(valuePath, action.value);
    }

    case types.VALIDATE_FIELD: {
      if (action.errors) {
        let errorsPath = action.path.concat([schemaMapping.field.errors]);
        return state.updateIn(errorsPath, (val) => {
          return Immutable.fromJS(action.errors);
        });
      }
      return state;
    }

    case types.ADD_MANY_CHILD: {
      let templatePath = action.path.concat([schemaMapping.many.template]);
      let template = state.getIn(templatePath);
      let contentsPath = action.path.concat([schemaMapping.many.contents]);
      let contents = state.getIn(contentsPath);
      contents = contents.push(template);
      return state.setIn(contentsPath, contents);
    }

    case types.REMOVE_MANY_CHILD: {
      return state.deleteIn(action.path);
    }

    case types.EDIT_MANY_CHILDREN: {
      let contentsPath = action.path.concat([schemaMapping.many.contents]);
      return state.updateIn(contentsPath, action.children);
    }

    case types.REORDER_MANY_CHILDREN: {
      let contentsPath = action.path.concat([schemaMapping.many.contents]);
      let contents = state.getIn(contentsPath);
      let updatedContents = Immutable.fromJS(action.order).map((index) =>
        contents.get(index)
      );
      return state.setIn(contentsPath, updatedContents);
    }

    case types.VALIDATE_MANY: {
      if (action.validate) {
        let errorsPath = action.path.concat([schemaMapping.many.errors]);
        let contentsPath = action.path.concat([schemaMapping.many.contents]);
        let contents = state.getIn(contentsPath);

        return state.updateIn(errorsPath, (val) => {
          // Run contents through the validator function
          return Immutable.fromJS(action.validate(contents.toJS()));
        });
      }
      return state;
    }

    case types.ADD_MANY_FORMS_CHILD: {
      let contentsPath = action.path.concat([schemaMapping.manyForms.contents]);
      let contents = state.getIn(contentsPath);

      let child = [
        "child_form",
        [
          action.formName,
          "child_form",
          action.form.get("form"),
          action.form.get("attributes_template"),
        ],
      ];

      contents = contents.push(Immutable.fromJS(child));
      return state.setIn(contentsPath, contents);
    }

    case types.REMOVE_MANY_FORMS_CHILD: {
      return state.deleteIn(action.path);
    }

    case types.EDIT_MANY_FORMS_CHILDREN: {
      let contentsPath = action.path.concat([schemaMapping.manyForms.contents]);
      return state.updateIn(contentsPath, action.children);
    }

    case types.REORDER_MANY_FORMS_CHILDREN: {
      let contentsPath = action.path.concat([schemaMapping.manyForms.contents]);
      let contents = state.getIn(contentsPath);
      let updatedContents = Immutable.fromJS(action.order).map((index) =>
        contents.get(index)
      );
      return state.setIn(contentsPath, updatedContents);
    }

    case types.VALIDATE_MANY_FORMS: {
      if (action.validate) {
        let errorsPath = action.path.concat([schemaMapping.manyForms.errors]);
        let contentsPath = action.path.concat([
          schemaMapping.manyForms.contents,
        ]);
        let contents = state.getIn(contentsPath);

        return state.updateIn(errorsPath, (val) => {
          // Run contents through the validator function
          return Immutable.fromJS(action.validate(contents.toJS()));
        });
      }
      return state;
    }

    default: {
      return state;
    }
  }
}
