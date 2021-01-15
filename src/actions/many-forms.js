import * as types from "../constants/action-types";

export function addChild(path, formName, form) {
  return { type: types.ADD_MANY_FORMS_CHILD, path, formName, form };
}

export function removeChild(path) {
  return { type: types.REMOVE_MANY_FORMS_CHILD, path };
}

export function editChildren(path, children) {
  return { type: types.EDIT_MANY_FORMS_CHILDREN, path, children };
}

export function reorderChildren(path, order) {
  return { type: types.REORDER_MANY_FORMS_CHILDREN, path, order };
}

export function validate(path, validate) {
  return { type: types.VALIDATE_MANY_FORMS, path, validate };
}
