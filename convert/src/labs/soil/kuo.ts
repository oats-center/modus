import debug from 'debug';
import type { LocalLabConfig } from '../index.js';

const mappings : LocalLabConfig["mappings"] = {
  IncKey: 'SampleNumber', //Incoming Key?
  RequestIncKey: undefined, // Request Incoming Key? Same as RptNo
  Client: 'ClientCompany',
  Grower: 'Grower',
  Sampler: undefined,
  LabNo: 'SampleContainerID',
  RptNo: 'LabReportID',
  Date: 'DateReceived',
  SampleDate: 'ReportDate',
  Field: 'Field',
  SampleID: undefined, //was blank and we already have lab-assigned and sampler-assigned ids,
  Crop: 'Crop',
  StartingDepth: 'StartingDepth',
  EndingDepth: 'EndingDepth',
  Test: undefined,
  ProjectId: undefined,
  ProjectNumber: undefined,
  ProjectName: undefined,
  MODUSEvent: 'ReportID'
}

// Make this as generic as possible so as to work on other labs

const config : LocalLabConfig = {
  name: 'Kuo Testing Laboratories',
  type: 'Soil',
  mappings,
  examplesKey: 'kuo'
};

export default config;