import debug from 'debug';
import xsd2jsonTests from './xsd2json.js';

const info = debug('@modusjs/cli#test/index:info');

info('Testing xsd2json');
xsd2jsonTests();
