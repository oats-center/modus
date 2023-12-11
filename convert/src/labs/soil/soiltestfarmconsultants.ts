import debug from 'debug';
import type { LocalLabConfig } from '../index.js';
const warn = debug('@modusjs/convert#labs:warn');

const mappings : LocalLabConfig["mappings"] = {
  'id code': 'SampleNumber',
  'grower name': 'Grower',
  'account name': 'ClientCompany',
  'Field ID': 'Field',
  'Grid': undefined,
  'Lab Number': 'SampleContainerID',
  'Field Desc': undefined,
  'Date Tested': ['ReportDate', 'DateReceived'],
  'Crop': undefined,
  'YLDGOAL': undefined,
  'depth range': 'StartingDepth',
  'OTHER ID#': undefined,
}

// Make this as generic as possible so as to work on other labs
const depthInfo = function(row: any) {
  let obj: LocalLabConfig["depthInfo"] = {};
  // if we do this match, it'll allow someone to append units afterward
  // and generically find it and attempt this
  let match = Object.keys(row).find(k => /^Depth/.test(k));
  if (!match) {
    warn(`Depth info could not be found`);
    return undefined;
    //throw new Error('Depth info could not be found')
  }
  let value = row[match].toString();
  if (value.match(' to ')) {
    obj.StartingDepth = +value.split(' to ')[0];
    obj.EndingDepth = +value.split(' to ')[1];
    obj.ColumnDepth = obj.EndingDepth - obj.StartingDepth;
    obj.Name = value;
    obj.DepthUnit = 'cm';
  }
  return obj;
}

const config : LocalLabConfig = {
  name: 'Soiltest Farm Consultants, Inc.',
  type: 'Soil',
  mappings,
  depthInfo,
  examplesKey: 'soiltestfarmconsultants'
};

export default config;