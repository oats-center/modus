import { observable } from 'mobx';
import debug from 'debug';

const warn = debug('@modusjs/app#state:warn');
const info = debug('@modusjs/apps#state:info');

// things that are too big to fit in the state without crashing browser
export type BigData = { rev: number };

export type Message = {
  type: 'good' | 'bad',
  msg: string,
};

export type Output = 'json' | 'csv' | 'trellis';

export type State = {
  messages: Message[],
  output: Output,
  trellis: { domain: string, token: string },
  inzone: boolean,
};

// Figure out the config: load from localStorage, but have default
export const state = observable<State>({
  messages: [],
  output: 'json',
  trellis: { domain: '', token: '' },
  inzone: false,
});


