import { ChangeType, ListWatch } from '@oada/list-lib';
import { types, flow } from 'mobx-state-tree';
import debug from 'debug';
import { OADAClient, connect } from '@oada/client';
import { state, State, Message } from './state';
import { action } from 'mobx';
import { message } from './actions';

const warn = debug("@modusjs/app#oada:warn");
const info = debug("@modusjs/app#oada:info");

// Set up watcher that processes oada changes into tree
// Optional - store the tree or just transform the change
// Create a list watch and give it to this mobx thing


function mirror(conn: OADAClient, path: string) {

  let lw = new ListWatch({
    path,
    conn
  })

  lw.on(ChangeType.ItemAdded, ({ item, id}: {item: any, id: string}) {
    state[conn.domain][path] = item;
  })
  lw.on(ChangeType.ItemRemoved, ({ item, id}: {item: any, id: string}) {
    state[conn.domain][path] = item;
  })

}
