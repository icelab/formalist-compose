import Immutable from 'immutable'
import { createStore } from 'redux'
import { batchActions, enableBatching } from 'redux-batched-actions'
import compiler from './compiler'
import reducer from './reducer'
import schemaMapping from './schema-mapping'
import { externalEvents } from './constants/event-types'
import createBuses from './buses'

const { FORM_CHANGE } = externalEvents

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
export default function composer (config = {}) {
  return (initialState) => {
    let immutableState = Immutable.fromJS(initialState)
    let store = createStore(enableBatching(reducer), immutableState)
    store.batchDispatch = (actions) => {
      store.dispatch(batchActions(actions))
    }

    // Create per-instance buses
    const { internalBus, externalBus } = createBuses()

    // Expose the store subscriptions through the external bus
    store.subscribe(() => externalBus.emit(FORM_CHANGE, store.getState))

    // Mapping
    const pathMapping = {}

    const api = {
      render: () => {
        return compiler({store, bus: internalBus, config, pathMapping})
      },
      // Expose the store’s getState method
      getState: store.getState,
      // Get value of a field by named path
      getValue: namePath => {
        const fieldMapping = pathMapping[namePath]
        if (fieldMapping != null) {
          const { path } = fieldMapping
          let valuePath = path.concat([schemaMapping.field.value])
          return store.getState().getIn(valuePath)
        } else {
          throw new Error(`No component matching namePath: ${namePath}`)
        }
      },
      // Set value of a field by named path
      setValue: (namePath, value) => {
        const fieldMapping = pathMapping[namePath]
        if (fieldMapping != null) {
          const { edit } = fieldMapping
          return edit(value)
        } else {
          throw new Error(`No component matching namePath: ${namePath}`)
        }
      },
      // Expose only the on/off methods from the external bus
      on: externalBus.on.bind(externalBus),
      off: externalBus.off.bind(externalBus),
      emit: externalBus.emit.bind(externalBus),
    }

    // Expose store through private convention environment only
    api.__test__ = {
      store,
    }

    return api
  }
}
