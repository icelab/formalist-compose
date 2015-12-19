'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _immutable = require('immutable');

var _immutable2 = _interopRequireDefault(_immutable);

var _redux = require('redux');

var _compiler = require('./compiler');

var _compiler2 = _interopRequireDefault(_compiler);

var _reducer = require('./reducer');

var _reducer2 = _interopRequireDefault(_reducer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Composes forms from the passed `config`. Returning a function that can
 * compile an abstract syntax tree (AST) that matches the Formalist schema with
 * said `config`.
 *
 * The returned (composed) function will also convert the AST to an Immutable
 * List and wrap it up as a redux store with a standard reducer.
 *
 * @param  {Object} config
 *
 * @return {Object}
 */

exports.default = function (config) {
  return function (initialState) {
    var immutableState = _immutable2.default.fromJS(initialState);
    var store = (0, _redux.createStore)(_reducer2.default, immutableState);
    return {
      render: function render() {
        return (0, _compiler2.default)(store, config);
      },
      store: store
    };
  };
};