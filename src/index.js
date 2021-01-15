export { default } from "./composer";
export { default as createFormConfig } from "./create-form-config";
import * as fieldActions from "./actions/fields";
import * as manyActions from "./actions/many";
import * as manyFormActions from "./actions/many-forms";
import * as fieldActionTypes from "./constants/action-types";
import { externalEvents, internalEvents } from "./constants/event-types";

export let actions = Object.assign(
  {},
  fieldActions,
  manyActions,
  manyFormActions
);
export let actionTypes = fieldActionTypes;
export let events = {
  external: externalEvents,
  internal: internalEvents,
};
