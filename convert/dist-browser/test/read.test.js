import debug from 'debug';
import xml_sample1 from '@modusjs/examples/dist/enyart-east50-a_l_labs/hand-modus_xml.js';
import '@modusjs/examples/dist/enyart-east50-a_l_labs/lab-modus_xml.js';
import '@modusjs/examples/dist/enyart-east50-a_l_labs/hand-modus_json.js';
const info = debug('@modusjs/convert#test-parse:info');
export default async function run(lib) {
    info('Parsing hand-modus_xml...');
    lib.xml.parse(xml_sample1);
    //info('Parsing lab-modus_xml...');
    //lib.xml.parse(xml_sample2);
    info('All parse tests passed');
}
//# sourceMappingURL=read.test.js.map