import { ChangeType, ListWatch } from '@oada/list-lib';
import { types, flow } from 'mobx-state-tree';
import debug from 'debug';
import { OADAClient, connect } from '@oada/client';
import { state, State, Message } from './state';
import { action } from 'mobx';
import { message } from './actions';

const warn = debug("@modusjs/app#oada:warn");
const info = debug("@modusjs/app#oada:info");

