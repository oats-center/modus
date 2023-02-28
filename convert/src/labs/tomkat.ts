import type { LabConfig } from './index.js';

const mappings : LabConfig["mappings"] = {
  'Kind Of Sample': undefined, //'EventType',
  'Lab No': 'LabID',
  'Cust No': 'AccountNumber',
  'Name': 'Name',
  'Company': 'Company',
  'Address 1': 'Address1',
  'Address 2': 'Address2',
  'City': 'City',
  'State': 'State',
  'Zip': 'Zip',
  'Grower': 'Grower',
  'Field ID': 'Field',
  'Sample ID': 'SampleNumber',
  'Date Recd': 'EventDate',
  'Date Rept': 'ProcessedDate',
  'B Depth': 'StartingDepth',
  'E Depth': 'EndingDepth',
  // I don't think these map to anything in modus:
  'Past Crop': undefined,
}

let analytes : LabConfig["analytes"] = {
  '1:1 Soil pH': {
    Element: 'pH',
    ModusTestID: 'S-PH-1:1.02.07',
    ValueUnit: 'none',
  },
  'WDRF Buffer pH': {
    Element: 'B-pH',
    ValueUnit: 'none',
    ModusTestID: 'S-BPH-WB.02', // assume this is not the modified woodruff
  },
  '1:1 S Salts': {
    ValueUnit: 'mmho/cm',
    ModusTestID: 'S-SS.19',
    Element: 'SS',
  },
  '1:1 S Salts mmho/cm': {
    ValueUnit: 'mmho/cm',
    ModusTestID: 'S-SS.19',
    Element: 'SS',
  },
  'Excess Lime': {
    Element: 'Excess-Lime',
  },
  'Texture No':{
    Element: 'Texture',
    ValueUnit: '%',
  },
  'Organic Matter LOI %': {
    ValueUnit: '%',
    Element: 'OM',
    ModusTestID: 'S-SOM-LOI.15',
  },
  'Nitrate-N ppm N': {
    ValueUnit: 'ppm',
    Element: 'NO3-N',
  },
  'lbs N/A': { // lbs N/acre
    ValueUnit: 'lb/ac',
    Element: 'N'
  },
  'Bray P-1 ppm P': {
    ValueUnit: 'ppm',
    Element: 'P (Bray P1 1:10)',
    ModusTestID: 'S-P-B1-1:10.01.03',
  },
  'Olsen P ppm P': {
    ValueUnit: 'ppm',
    Element: 'P (Olsen)',
    ModusTestID: 'S-P-BIC.04',
  },
  'Potassium ppm K': {
    ValueUnit: 'ppm',
    Element: 'K',
  },
  'Sulfate-S ppm S': {
    ValueUnit: 'ppm',
    Element: 'SO4-S',
  },
  'Zinc ppm Zn': {
    ValueUnit: 'ppm',
    Element: 'Zn',
  },
  'Iron ppm Fe': {
    ValueUnit: 'ppm',
    Element: 'Fe',
  },
  'Manganese ppm Mn': {
    ValueUnit: 'ppm',
    Element: 'Mn',
  },
  'Copper ppm Cu': {
    ValueUnit: 'ppm',
    Element: 'Cu',
  },
  'Calcium ppm Ca': {
    ValueUnit: 'ppm',
    Element: 'Ca',
  },
  'Magnesium ppm Mg': {
    ValueUnit: 'ppm',
    Element: 'Mg',
  },
  'Sodium ppm Na': {
    ValueUnit: 'ppm',
    Element: 'Na',
  },
  'Boron ppm B': {
    ValueUnit: 'ppm',
    Element: 'B',
  },
  'CEC/Sum of Cations me/100g': {
    ValueUnit: 'meq/100g',
    Element: 'CEC',
  },
  '2N KCl NO3-N ppm N': {
    ValueUnit: 'ppm',
    Element: 'NO3-N',
    ModusTestID: 'S-NO3-1:5.01.01',
  },
  'KCl NH4-N ppm': {
    ValueUnit: 'ppm',
    Element: 'NH4-N',
  },
  'Aluminum ppm Al': {
    ValueUnit: 'ppm',
    Element: 'Al',
  },
  'Chloride ppm Cl': {
    ValueUnit: 'ppm',
    Element: 'Cl',
  },
  'Bray P-2 ppm P': {
    ValueUnit: 'ppm',
    Element: 'P (Bray P2 1:10)',
    ModusTestID: 'S-P-B2-1:10.01.03',
  },
  'Mehlich P-II ppm P': {
    ValueUnit: 'ppm',
    Element: 'P',
    ModusTestID: 'S-P-M2.04',
  },
  'Mehlich P-III ppm P': {
    Element: 'P',
    ValueUnit: 'ppm',
    ModusTestID: 'S-P-M3.04',
  },
  'Salt pH': {
    Element: 'pH',
    ValueUnit: 'none',
    //multiple salt pH, could be 1:1, 1:2 or 1:5 salt
  },
  'Salt Buffer pH': {
    Element: 'pH',
    ValueUnit: 'none',
  },
  'WB OM %': {
    ValueUnit: '%',
    Element: 'OM',
    // 4 different Walkley-Black methods exist
  },
  'Total N ppm': {
    ValueUnit: 'ppm',
    Element: 'TN',
  },
  'Soil Moisture %': {
    ValueUnit: '%',
    Element: 'Soil-Moisture',
    ModusTestID: 'S-MOIST-GRAV.00', // Could also be S-MOIST-GRAVAR.15 (as received), but I think this was taken in the field
  },
  'Total P ppm': {
    ValueUnit: 'ppm',
    Element: 'TP',
  },
  'Total Zn ppm': {
    ValueUnit: 'ppm',
    Element: 'TZn',
  },
  'Nitrite-N ppm': {
    ValueUnit: 'ppm',
    Element: 'NO2-N',
    ModusTestID: 'S-NO2-KCL.01', // only method for nitrite
  },
  '% Sand': {
    ValueUnit: '%',
    Element: 'Sand',
  },
  '% Silt': {
    ValueUnit: '%',
    Element: 'Silt',
  },
  '% Clay': {
    ValueUnit: '%',
    Element: 'Clay',
  },
  'Texture': {
    ValueUnit: 'none',
    Element: 'Texture',
  },
  'Paste % Sat': {
    ValueUnit: '%',
    Element: 'Sat-Pct',
    ModusTestID: 'S-SP%.19',
  },
  'Paste pH': {
    Element: 'pH',
    ValueUnit: 'none',
    ModusTestID: 'S-PH-SP.02', //only paste method
  },
  'Paste EC mmho/cm': {
    ValueUnit: 'mmho/cm',
    Element: 'EC',
    ModusTestID: 'S-EC-SP.03', // only paste method
  },
  'Paste HCO3 ppm': {
    ValueUnit: 'ppm',
    Element: 'HCO3',
  },
  'Paste Cl ppm': {
    ValueUnit: 'ppm',
    Element: 'Cl',
  },
  'Paste Ca ppm': {
    ValueUnit: 'ppm',
    Element: 'Ca',
  },
  'Paste Mg ppm': {
    ValueUnit: 'ppm',
    Element: 'Mg',
  },
  'Paste Na ppm': {
    ValueUnit: 'ppm',
    Element: 'Na',
    ModusTestID: 'S-NA-SP.05', //only paste method
  },
  'Paste S ppm': {
    ValueUnit: 'ppm',
    Element: 'S',
  },
  'Paste SAR': {
    ValueUnit: 'ppm',
    Element: 'SAR',
    ModusTestID: 'S-SAR-SP.00', //only paste method
  },

  // Recommendations
  'Crop 1': {
    ValueUnit: 'none',
    Element: 'Crop 1',
  },
  'YG 1': { // Yield Goal
    ValueUnit: 'bu/ac',
    Element: 'YG 1',
  },
  'Crop 2': {
    ValueUnit: 'none',
    Element: 'Crop 2',
  },
  'YG 2': {
    ValueUnit: 'bu/ac',
    Element: 'YG 2',
  },
  'Crop 3': {
    ValueUnit: 'none',
    Element: 'Crop 3',
  },
  'YG 3': {
    ValueUnit: 'bu/ac',
    Element: 'YG 3',
  },
  'Nitrogen Rec': {
    ValueUnit: 'lb/ac',
    Element: 'N-Rec',
  },
  //TODO: Fix this after addressing duplicate header bug in examples.
  // Without these Rec_1, Rec_2, etc, autorecognition cannot occur
  'Nitrogen Rec_1': {
    ValueUnit: 'lb/ac',
    Element: 'N-Rec',
  },
  'Nitrogen Rec_2': {
    ValueUnit: 'lb/ac',
    Element: 'N-Rec',
  },
  'P2O5 Rec': {
    ValueUnit: 'lb/ac',
    Element: 'P2O5-Rec',
  },
  'P2O5 Rec_1': {
    ValueUnit: 'lb/ac',
    Element: 'P2O5-Rec',
  },
  'P2O5 Rec_2': {
    ValueUnit: 'lb/ac',
    Element: 'P2O5-Rec',
  },
  'K2O Rec': {
    ValueUnit: 'lb/ac',
    Element: 'K2O-Rec',
  },
  'K2O Rec_1': {
    ValueUnit: 'lb/ac',
    Element: 'K2O-Rec',
  },
  'K2O Rec_2': {
    ValueUnit: 'lb/ac',
    Element: 'K2O-Rec',
  },
  'Sulfur Rec': {
    ValueUnit: 'lb/ac',
    Element: 'S-Rec',
  },
  'Sulfur Rec_1': {
    ValueUnit: 'lb/ac',
    Element: 'S-Rec',
  },
  'Sulfur Rec_2': {
    ValueUnit: 'lb/ac',
    Element: 'S-Rec',
  },
  'Zinc Rec': {
    ValueUnit: 'lb/ac',
    Element: 'Zn-Rec',
  },
  'Zinc Rec_1': {
    ValueUnit: 'lb/ac',
    Element: 'Zn-Rec',
  },
  'Zinc Rec_2': {
    ValueUnit: 'lb/ac',
    Element: 'Zn-Rec',
  },
  'Magnesium Rec': {
    ValueUnit: 'lb/ac',
    Element: 'Mg-Rec',
  },
  'Magnesium Rec_1': {
    ValueUnit: 'lb/ac',
    Element: 'Mg-Rec',
  },
  'Magnesium Rec_2': {
    ValueUnit: 'lb/ac',
    Element: 'Mg-Rec',
  },
  'Iron Rec': {
    ValueUnit: 'lb/ac',
    Element: 'Fe-Rec',
  },
  'Iron Rec_1': {
    ValueUnit: 'lb/ac',
    Element: 'Fe-Rec',
  },
  'Iron Rec_2': {
    ValueUnit: 'lb/ac',
    Element: 'Fe-Rec',
  },
  'Manganese Rec': {
    ValueUnit: 'lb/ac',
    Element: 'Mn-Rec',
  },
  'Manganese Rec_1': {
    ValueUnit: 'lb/ac',
    Element: 'Mn-Rec',
  },
  'Manganese Rec_2': {
    ValueUnit: 'lb/ac',
    Element: 'Mn-Rec',
  },
  'Copper Rec': {
    ValueUnit: 'lb/ac',
    Element: 'Cu-Rec',
  },
  'Copper Rec_1': {
    ValueUnit: 'lb/ac',
    Element: 'Cu-Rec',
  },
  'Copper Rec_2': {
    ValueUnit: 'lb/ac',
    Element: 'Cu-Rec',
  },
  'Boron Rec': {
    ValueUnit: 'lb/ac',
    Element: 'B-Rec',
  },
  'Boron Rec_1': {
    ValueUnit: 'lb/ac',
    Element: 'B-Rec',
  },
  'Boron Rec_2': {
    ValueUnit: 'lb/ac',
    Element: 'B-Rec',
  },
  'Lime Rec': {
    ValueUnit: 'lb/ac',
    Element: 'Lime-Rec',
  },
  'Lime Rec_1': {
    ValueUnit: 'lb/ac',
    Element: 'Lime-Rec',
  },
  'Lime Rec_2': {
    ValueUnit: 'lb/ac',
    Element: 'Lime-Rec',
  },
  'Organic Carbon %': {
    ValueUnit: '%',
    Element: 'OC',
  },
  'Water Soluble K': { // 3 different water extraction methods exist
    Element: 'K',
  },
  'Total Carbon %': {
    ValueUnit: '%',
    Element: 'TC',
    ModusTestID: 'S-TC-COMB.15', //only one method exists
  },
  'H2O NO3-N': {
    ValueUnit: 'ppm',
    Element: 'NO3-N',
    ModusTestID: 'S-NO3-W1:1.01.01', //only water extraction method
  },
  'Total Dry Weight': {
    Element: 'Dry-Weight',
  },
  'Total S': {
    ValueUnit: 'ppm',
    Element: 'TS',
    ModusTestID: 'S-S-EPA6010B.00', //only TS method
  },
  'PSNT N/A': {//Pre-Sidedress Nitrate Test - Nitrate/Acre; It sounds as though
    // this is a sampling procedure rather than necessarily a lab procedure
    ValueUnit: 'lb/ac',
    Element: 'PSNT-N',
  },
  'H2O Ca': {
    Element: 'Ca',
    // 3 different water extraction methods exist
  },
  'Paste CO3 ppm': {
    ValueUnit: 'ppm',
    Element: 'CO3',
    // 2 different paste methods exist
  },
  'Phosphorus M3 ICAP ppm P': {
    ValueUnit: 'ppm',
    Element: 'P',
    ModusTestID: 'S-P-M3.04', // I think... ICAP == ICP?
  },
  'Potassium M3 ICAP ppm K': {
    ValueUnit: 'ppm',
    Element: 'K',
    ModusTestID: 'S-K-M3.05', // I think... ICAP == ICP?
  },
  'Sulfur M3 ICAP ppm S': {
    ValueUnit: 'ppm',
    Element: 'S',
    ModusTestID: 'S-S-M3.05', // I think... ICAP == ICP?
  },
  'Zinc M3 ICAP ppm Zn': {
    ValueUnit: 'ppm',
    Element: 'Zn',
    ModusTestID: 'S-ZN-M3.05', // I think... ICAP == ICP?
  },
  'Iron M3 ICAP ppm Fe': {
    ValueUnit: 'ppm',
    Element: 'Fe',
    ModusTestID: 'S-FE-M3.05', // I think... ICAP == ICP?
  },
  'Manganese M3 ICAP ppm Mn': {
    ValueUnit: 'ppm',
    Element: 'Mn',
    ModusTestID: 'S-MN-M3.05', // I think... ICAP == ICP?
  },
  'Copper M3 ICAP ppm Cu': {
    ValueUnit: 'ppm',
    Element: 'Cu',
    ModusTestID: 'S-CU-M3.05', // I think... ICAP == ICP?
  },
  'Calcium M3 ICAP ppm Ca': {
    ValueUnit: 'ppm',
    Element: 'Ca',
    ModusTestID: 'S-CA-M3.05', // I think... ICAP == ICP?
  },
  'Magnesium M3 ICAP ppm Mg': {
    ValueUnit: 'ppm',
    Element: 'Mg',
    ModusTestID: 'S-MG-M3.05', // I think... ICAP == ICP?
  },
  'Sodium M3 ICAP ppm Na': {
    ValueUnit: 'ppm',
    Element: 'Na',
    ModusTestID: 'S-NA-M3.05', // I think... ICAP == ICP?
  },
  'Boron M3 ICAP ppm B': {
    ValueUnit: 'ppm',
    Element: 'B',
    ModusTestID: 'S-B-M3.05', // I think... ICAP == ICP?
  },
  '1N KCl NO3-N ppm N': {
    ValueUnit: 'ppm',
    Element: 'NO3-N',
    ModusTestID: 'S-NO3-KCL.01.01',
  },
  'KCl NH4-N ppm (Old)': {
    ValueUnit: 'ppm',
    Element: 'NH4-N',
    ModusTestID: 'S-NH4-KCL.01.05',
  },
  '2N KCl NO3-N ppm N (Old)': {
    ValueUnit: 'ppm',
    Element: 'NO3-N',
    ModusTestID: 'S-NO3-1:5.01.01',
  },
  '2N KCL NO3 Lbs-Acre': {
    ValueUnit: 'lb/ac',
    Element: 'NO3-N',
  },
  'Ammonium Lbs-Acre': {
    ValueUnit: 'lb/ac',
    Element: 'NH4-N',
  },
  'Aluminium M3 ICAP ppm Al': {
    ValueUnit: 'ppm',
    Element: 'Al',
    ModusTestID: 'S-AL-M3.05',
  },
  'Organic C H2O ppm': {
    ValueUnit: 'ppm',
    Element: 'OC',
  },
  'Organic N H2O ppm': {
    ValueUnit: 'ppm',
    Element: 'ON',
    ModusTestID: 'S-ON.19', //only option
  },
  'Organic C:N H2O': {
    ValueUnit: 'none',
    Element: 'OCNR',
  },
  'PSNT ppm N': {
    ValueUnit: 'ppm',
    Element: 'PSNT-N',
  },
  'Sikora pH': {
    Element: 'pH',
    ValueUnit: 'none',
    // modus lists no sikora ph methods
  },
  'Sikora Buffer': {
    ValueUnit: 'none',
    Element: 'B-pH',
    // modus lists two sikora buffer ph methods
  },
  'Bulk Density': {
    Element: 'Bulk-Density',
  },
  '2:1 Soil pH': {
    Element: 'pH',
    ValueUnit: 'none',
    //2:1 water or CaCl method?
  },
  '2:1 Soluble Salts': {
    ValueUnit: 'ppm', //assumed this
    Element: 'SS',
    //modus only has 'calculated' method
  },
  'POX-C ppm C': {
    ValueUnit: 'ppm',
    Element: 'Active-Carbon',
    ModusTestID: 'S-AC-KMNO4.01',
  },

  // These are more of soil texture/moisture analysis results; stability is not
  // included in modus
  'Aggregate Stability 1-2mm %': {
    ValueUnit: '%',
    Element: 'Aggregate Stability 1-2mm %',
  },
  'Aggregate Stability 1-2mm in bulk soil %': {
    ValueUnit: '%',
    Element: 'Aggregate Stability 1-2mm in bulk soil %',
  },
  'Available Water g H2O g-1 soil': {
    ValueUnit: '%',
    Element: 'Moisture',
  },
  'Available Water inch H2O inch-1 of soil': {
    ValueUnit: '%',
    Element: 'Moisture',
  },
  'Total Available Water inches H2O sample-1': {
    ValueUnit: '%',
    Element: 'Moisture',
  },
  'Field Capacity % (wt.)': {
    ValueUnit: '%',
    Element: 'Moisture',
  },
  'Permanent Wilting Point % (wt.': {
    ValueUnit: '%',
    Element: 'Moisture'
  },
  'Total K ppm K': {
    ValueUnit: 'ppm',
    Element: 'TK',
  },
  'Total C Concentration %': {
    ValueUnit: '%',
    Element: 'C',
  },
  'Total C lbs/Acre': {
    ValueUnit: 'lb/ac',
    Element: 'C',
  },
  'Total N Concentration %': {
    ValueUnit: '%',
    Element: 'N',
  },
  'Total N lbs/Acre': {
    ValueUnit: 'lb/ac',
    Element: 'N',
  },
  'Total C:N lbs/Acre Ratio': {
    ValueUnit: 'none',
    Element: 'TCNR',
    ModusTestID: 'S-TC:TN.19', //only option
  },
  'Total P Concentration %': {
    ValueUnit: '%',
    Element: 'TP',
  },
  'Total P lbs/Acre': {
    ValueUnit: 'lb/ac',
    Element: 'TP',
  },
  'Total P2O5 Concentration %': {
    ValueUnit: '%',
    Element: 'TP205',
  },
  'Total P2O5 lbs/Acre': {
    ValueUnit: 'lb/ac',
    Element: 'TP205',
  },
  'Total K Concentration %': {
    ValueUnit: '%',
    Element: 'TK',
  },
  'Total K lbs/Acre': {
    ValueUnit: 'lb/ac',
    Element: 'TK',
  },
  'Total K2O Concentration %': {
    ValueUnit: '%',
    Element: 'TK2O',
  },
  'Total K2O lbs/Acre': {
    ValueUnit: 'lb/ac',
    Element: 'TK20',
  },
  'Total Ca Concentration %': {
    ValueUnit: '%',
    Element: 'TCa',
  },
  'Total Ca lbs/Acre': {
    ValueUnit: 'lb/ac',
    Element: 'TCa',
  },
  'Total Mg Concentration %': {
    ValueUnit: '%',
    Element: 'TMg',
  },
  'Total Mg lbs/Acre': {
    ValueUnit: 'lb/ac',
    Element: 'TMg',
  },
  'Total S Concentration %': {
    ValueUnit: '%',
    Element: 'TS', //No methods for TS with units of % exist
  },
  'Total S lbs/Acre': {
    ValueUnit: 'lb/ac',
    Element: 'TS', //No methods for TS with units of lb/ac
  },
  'Total Zn Concentration ppm': {
    ValueUnit: 'ppm',
    Element: 'TZn',
  },
  'Total Zn lbs/Acre': {
    ValueUnit: 'lb/ac',
    Element: 'TZn',
  },
  'Total Fe Concentration ppm': {
    ValueUnit: 'ppm',
    Element: 'TFe',
  },
  'Total Fe lbs/Acre': {
    ValueUnit: 'lb/ac',
    Element: 'TFe',
  },
  'Total Mn Concentration ppm': {
    ValueUnit: 'ppm',
    Element: 'TMn',
  },
  'Total Mn lbs/Acre': {
    ValueUnit: 'lb/ac',
    Element: 'TMn',
  },
  'Total Cu Concentration ppm': {
    ValueUnit: 'ppm',
    Element: 'TCu',
  },
  'Total Cu lbs/Acre': {
    ValueUnit: 'lb/ac',
    Element: 'TCu',
  },
  'Total B Concentration ppm': {
    ValueUnit: 'ppm',
    Element: 'TB',
  },
  'Total B lbs/Acre': {
    ValueUnit: 'lb/ac',
    Element: 'TB',
  },
  'Total Mo Concentration ppm': {
    ValueUnit: 'ppm',
    Element: 'TMo',
  },
  'Total Mo lbs/Acre': {
    ValueUnit: 'lb/ac',
    Element: 'TMo',
  },
  'Total Ni ppm Ni': {
    ValueUnit: 'ppm',
    Element: 'TNi',
  },
  'Total As ppm As': {
    ValueUnit: 'ppm',
    Element: 'TAs',
  },
  'Total Cd ppm Cd': {
    ValueUnit: 'ppm',
    Element: 'TCd',
  },
  'Total Pb ppm Pb': {
    ValueUnit: 'ppm',
    Element: 'TPd',
  },
  'Total Cr ppm Cr': {
    ValueUnit: 'ppm',
    Element: 'TCr',
  },
  'Total Co ppm Co': {
    ValueUnit: 'ppm',
    Element: 'TCo',
  },
  'Total Se ppm Se': {
    ValueUnit: 'ppm',
    Element: 'TSe',
  },
  'Total Mo ppm Mo': {
    ValueUnit: 'ppm',
    Element: 'TMo',
  },
  'H2O NH4-N': {
    ValueUnit: 'ppm',
    Element: 'NH4-N',
    ModusTestID: 'S-NH4N-W1:1.01', //only water method
  },
  'Sample Density g/cc': {
    Element: 'Bulk-Density', //I think this is right?
    ValueUnit: 'g/cc',
  },
  'Molybdenum Hot Water ppm Mo': {
    ValueUnit: 'ppm',
    Element: 'Mo',
    ModusTestID: 'S-MO-HOTH2O.04',
  },
  'H2O P': {
    ValueUnit: 'ppm',
    Element: 'P',
  },
  'Texture By Feel': {
    ValueUnit: 'none',
    Element: 'Texture',
    //ModusTestID: 'S-TEXTURE.19'
  },
  'Comprehensive Bulk Density': {
    Element: 'Bulk-Density',
  },
  'H3A K': {
    ValueUnit: 'ppm',
    Element: 'K',
    ModusTestID: 'S-K-H3A1.01.04',
  },
  'CO2 Soil Respiration': {
    Element: 'CO2 Respiration',
    ModusTestID: 'S-CO2-RESP.01',
  },


  // Not in modus
  'Ace Protein g/Kg': {
    ValueUnit: 'g/kg',
    Element: 'Ace-Protein',
  },
  'Rock Volume cm3': {
    ValueUnit: 'cm3',
    Element: 'Rock-Volume',
  },
  'Rock Density g/cm3': {
    ValueUnit: 'g/cm3',
    Element: 'Rock-Density',
  },
  'Rocks grams': {
    ValueUnit: 'g',
    Element: 'Rocks',
  },
  'Roots grams': {
    ValueUnit: 'g',
    Element: 'Roots',
  },

   // Alternate Units
  '%H Sat': {
    ValueUnit: '%',
    Element: 'BS-H',
    ModusTestID: 'S-BS-H.19',
  },
  '%K Sat': {
    ValueUnit: '%',
    Element: 'BS-K',
    ModusTestID: 'S-BS-K.19',
  },
  '%K Sat_1': {
    ValueUnit: '%',
    Element: 'BS-K',
    ModusTestID: 'S-BS-K.19',
  },
  '%Ca Sat': {
    Element: 'BS-Ca',
    ValueUnit: '%',
    ModusTestID: 'S-BS-CA.19',
  },
  '%Mg Sat': {
    Element: 'BS-Mg',
    ValueUnit: '%',
    ModusTestID: 'S-BS-MG.19',
  },
  '%Na Sat': {
    Element: 'BS-Na',
    ValueUnit: '%',
    ModusTestID: 'S-BS-NA.19',
  },
}
analytes = Object.fromEntries(Object.entries(analytes).map(([key, val]) =>
  [
    key,
    {
      ...val,
      CsvHeader: key
    }
  ]
))

const depthInfo = function(row: any) {

}
}

const units : LabConfig["units"] = Object.fromEntries(
  Object.entries(analytes).map(([key, val]) => ([key, val?.ValueUnit]))
);

const config : LabConfig = {
  name: 'TomKat Ranch Labs',
  units,
  mappings,
  analytes,
  headers: [...Object.keys(analytes), ...Object.keys(mappings)],
  examplesKey: 'tomkat_historic',
  depthInfo,
};

export default config;