"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.events = exports.actionTypes = exports.actions = exports.createFormConfig = exports.default = undefined;

var _composer = require("./composer");

Object.defineProperty(exports, "default", {
  enumerable: true,
  get: function get() {
    return _interopRequireDefault(_composer).default;
  }
});

var _createFormConfig = require("./create-form-config");

Object.defineProperty(exports, "createFormConfig", {
  enumerable: true,
  get: function get() {
    return _interopRequireDefault(_createFormConfig).default;
  }
});

var _fields = require("./actions/fields");

var fieldActions = _interopRequireWildcard(_fields);

var _many = require("./actions/many");

var manyActions = _interopRequireWildcard(_many);

var _manyForms = require("./actions/many-forms");

var manyFormActions = _interopRequireWildcard(_manyForms);

var _actionTypes = require("./constants/action-types");

var fieldActionTypes = _interopRequireWildcard(_actionTypes);

var _eventTypes = require("./constants/event-types");

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var actions = exports.actions = Object.assign({}, fieldActions, manyActions, manyFormActions);
var actionTypes = exports.actionTypes = fieldActionTypes;
var events = exports.events = {
  external: _eventTypes.externalEvents,
  internal: _eventTypes.internalEvents
};