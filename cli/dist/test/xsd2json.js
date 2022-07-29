import debug from 'debug';
import { execaCommand } from 'execa';
const info = debug('@modusjs/cli#test:info');
function passthru(command) {
    info('Running command: ', command);
    const ps = execaCommand(command);
    if (ps.stdout)
        ps.stdout.pipe(process.stdout);
    if (ps.stderr)
        ps.stderr.pipe(process.stderr);
}
export default function run() {
    info('xsd2json runs');
    passthru('yarn xsd2json -d assets/modus_global.xsd assets/modus_result.xsd');
}
//# sourceMappingURL=xsd2json.js.map