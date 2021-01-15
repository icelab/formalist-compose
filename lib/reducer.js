"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = reducer;

var _immutable = require("immutable");

var _immutable2 = _interopRequireDefault(_immutable);

var _schemaMapping = require("./schema-mapping");

var _schemaMapping2 = _interopRequireDefault(_schemaMapping);

var _actionTypes = require("./constants/action-types");

var types = _interopRequireWildcard(_actionTypes);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
function reducer(state, action) {
  switch (action.type) {
    case types.REMOVE_FIELD:
      {
        return state.deleteIn(action.path);
      }

    case types.EDIT_FIELD:
      {
        var valuePath = action.path.concat([_schemaMapping2.default.field.value]);
        return state.updateIn(valuePath, action.value);
      }

    case types.VALIDATE_FIELD:
      {
        if (action.errors) {
          var errorsPath = action.path.concat([_schemaMapping2.default.field.errors]);
          return state.updateIn(errorsPath, function (val) {
            return _immutable2.default.fromJS(action.errors);
          });
        }
        return state;
      }

    case types.ADD_MANY_CHILD:
      {
        var templatePath = action.path.concat([_schemaMapping2.default.many.template]);
        var template = state.getIn(templatePath);
        var contentsPath = action.path.concat([_schemaMapping2.default.many.contents]);
        var contents = state.getIn(contentsPath);
        contents = contents.push(template);
        return state.setIn(contentsPath, contents);
      }

    case types.REMOVE_MANY_CHILD:
      {
        return state.deleteIn(action.path);
      }

    case types.EDIT_MANY_CHILDREN:
      {
        var _contentsPath = action.path.concat([_schemaMapping2.default.many.contents]);
        return state.updateIn(_contentsPath, action.children);
      }

    case types.REORDER_MANY_CHILDREN:
      {
        var _contentsPath2 = action.path.concat([_schemaMapping2.default.many.contents]);
        var _contents = state.getIn(_contentsPath2);
        var updatedContents = _immutable2.default.fromJS(action.order).map(function (index) {
          return _contents.get(index);
        });
        return state.setIn(_contentsPath2, updatedContents);
      }

    case types.VALIDATE_MANY:
      {
        if (action.validate) {
          var _errorsPath = action.path.concat([_schemaMapping2.default.many.errors]);
          var _contentsPath3 = action.path.concat([_schemaMapping2.default.many.contents]);
          var _contents2 = state.getIn(_contentsPath3);

          return state.updateIn(_errorsPath, function (val) {
            // Run contents through the validator function
            return _immutable2.default.fromJS(action.validate(_contents2.toJS()));
          });
        }
        return state;
      }

    case types.ADD_MANY_FORMS_CHILD:
      {
        var _contentsPath4 = action.path.concat([_schemaMapping2.default.manyForms.contents]);
        var _contents3 = state.getIn(_contentsPath4);

        var child = ["child_form", [action.formName, "child_form", action.form.get("form"), action.form.get("attributes_template")]];

        _contents3 = _contents3.push(_immutable2.default.fromJS(child));
        return state.setIn(_contentsPath4, _contents3);
      }

    case types.REMOVE_MANY_FORMS_CHILD:
      {
        return state.deleteIn(action.path);
      }

    case types.EDIT_MANY_FORMS_CHILDREN:
      {
        var _contentsPath5 = action.path.concat([_schemaMapping2.default.manyForms.contents]);
        return state.updateIn(_contentsPath5, action.children);
      }

    case types.REORDER_MANY_FORMS_CHILDREN:
      {
        var _contentsPath6 = action.path.concat([_schemaMapping2.default.manyForms.contents]);
        var _contents4 = state.getIn(_contentsPath6);
        var _updatedContents = _immutable2.default.fromJS(action.order).map(function (index) {
          return _contents4.get(index);
        });
        return state.setIn(_contentsPath6, _updatedContents);
      }

    case types.VALIDATE_MANY_FORMS:
      {
        if (action.validate) {
          var _errorsPath2 = action.path.concat([_schemaMapping2.default.manyForms.errors]);
          var _contentsPath7 = action.path.concat([_schemaMapping2.default.manyForms.contents]);
          var _contents5 = state.getIn(_contentsPath7);

          return state.updateIn(_errorsPath2, function (val) {
            // Run contents through the validator function
            return _immutable2.default.fromJS(action.validate(_contents5.toJS()));
          });
        }
        return state;
      }

    default:
      {
        return state;
      }
  }
}