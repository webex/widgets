import {readdirSync, readFileSync} from 'node:fs';
import {dirname, join, relative} from 'node:path';
import {fileURLToPath} from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const declarationRoots = [
  join(scriptDirectory, '..', '..', 'store', 'dist'),
  join(scriptDirectory, '..', '..', 'ai-assistant', 'dist'),
  join(scriptDirectory, '..', 'dist'),
];

const internalStateControlSymbols = [
  'setAgentChannelState',
  'stateChangeV2',
  'AgentChannelState',
  'AgentChannelRelogin',
  'AGENT_CHANNEL_',
  'WellnessStateModel',
  'WellnessCapturedChannel',
  'UseWellnessBreakInput',
  'useWellnessBreak',
];

const collectDeclarations = (directory) =>
  readdirSync(directory, {withFileTypes: true}).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      return collectDeclarations(path);
    }

    return path.endsWith('.d.ts') ? [path] : [];
  });

const leaks = declarationRoots.flatMap((root) =>
  collectDeclarations(root).flatMap((file) => {
    const contents = readFileSync(file, 'utf8');

    return internalStateControlSymbols
      .filter((symbol) => contents.includes(symbol))
      .map((symbol) => `${relative(join(scriptDirectory, '..', '..'), file)}: ${symbol}`);
  })
);

if (leaks.length > 0) {
  throw new Error(`State Control V2 leaked into public declarations:\n${leaks.join('\n')}`);
}

console.log('Widget public declarations exclude State Control V2 APIs.');
