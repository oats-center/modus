import { action } from 'mobx';
import { state, State, Message } from './state';
import debug from 'debug';

const warn = debug("@modusjs/app#actions:warn");
const info = debug("@modusjs/app#actions:info");

export const message = action('message', (msg: Message | string) => {
  if (typeof msg === 'string') {
    msg = { type: 'good', msg };
  }
  state.messages = [...state.messages, msg];
});

export const output = action('output', (output: State['output']) => {
  state.output = output;
});

export const trellis = action('trellis', (cfg: { domain?: string, token?: string}) => {
  if (typeof cfg.domain !== 'undefined') state.trellis.domain = cfg.domain;
  if (typeof cfg.token !== 'undefined') state.trellis.token = cfg.token;
});

export const inzone = action('inzone', (inzone: State['inzone']) => {
  state.inzone = inzone;
});

export const headless = action('headless', (headless: State['headless']) => {
  state.headless = headless;
});
