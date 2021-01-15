"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.addChild = addChild;
exports.removeChild = removeChild;
exports.editChildren = editChildren;
exports.reorderChildren = reorderChildren;
exports.validate = validate;

var _actionTypes = require("../constants/action-types");

var types = _interopRequireWildcard(_actionTypes);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function addChild(path, formName, form) {
  return { type: types.ADD_MANY_FORMS_CHILD, path: path, formName: formName, form: form };
}

function removeChild(path) {
  return { type: types.REMOVE_MANY_FORMS_CHILD, path: path };
}

function editChildren(path, children) {
  return { type: types.EDIT_MANY_FORMS_CHILDREN, path: path, children: children };
}

function reorderChildren(path, order) {
  return { type: types.REORDER_MANY_FORMS_CHILDREN, path: path, order: order };
}

function validate(path, validate) {
  return { type: types.VALIDATE_MANY_FORMS, path: path, validate: validate };
}