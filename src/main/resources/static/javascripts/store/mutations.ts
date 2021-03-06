import { MutationTree } from 'vuex';
import * as _ from 'lodash';
import { MUTATION } from './mutation-types';
import { State } from './State';
import { ResponseBase } from './model/ResponseBase';
import { ResponseText } from './model/ResponseText';
import { ResponseTable } from './model/ResponseTable';
import { ResponseTableRow } from './model/ResponseTableRow';
import { ResponseTransferObject } from './model/ResponseTransferObject';
import { UserCancelError } from './error/UserCancelError';

const mutations = <MutationTree<State>> {
  [MUTATION.INPUT_SQL](state: State, sql: string) {
    state.sql = sql;
  },
  [MUTATION.SUBMIT](state: State, response: ResponseBase) {
    state.results.unshift(response);
  },
  [MUTATION.SUBMITED](state: State) {
    state.sequence = state.sequence + 1;
  },
  [MUTATION.ON_RESPONSE](state: State, responseTransferObject: ResponseTransferObject) {
    if (responseTransferObject.errorMessage !== null) {
      for (const row of state.results) {
        if (row.sequence === responseTransferObject.sequence) {
          row.mode = 0;
          (row as ResponseText).text = responseTransferObject.errorMessage;
        }
      }
    } else {
      const json = responseTransferObject.payload;
      const responseRows = json.split(/\n/);

      for (const responseRow of responseRows) {
        if (responseRow === '') {
          continue;
        }

        const response: ResponseBase = JSON.parse(responseRow);

        for (const row of state.results) {
          if (row.sequence === response.sequence) {

            if (state.cancels.has(response.sequence)) {
              state.cancels.delete(response.sequence);
              throw new UserCancelError('Canceled by user');
            }

            // apply response data to screen
            row.mode = response.mode;
            if (row.mode === 0) {
              // text
              (row as ResponseText).text = (response as ResponseText).text;
            } else {
              // table
              const responseTable = row as ResponseTable;
              if (responseTable.data === undefined) {
                responseTable.data = [];
              }
              responseTable.data.push((response as ResponseTableRow).data);
            }
          }
        }
      }
    }

    // FIXME Since update of ResponseTable is not detected by vue.js, deepcopy and forcibly reflect it
    state.results = _.cloneDeep(state.results);
  },
  [MUTATION.CANCEL](state: State, id: number) {
    state.cancels.add(id);
  },
};

export default mutations;
