import {
  getAgentViewableGlobalVariables,
  CallAssociatedDataMap,
  SYSTEM_CAD_KEYS,
} from '../../../src/components/task/task.types';

describe('getAgentViewableGlobalVariables', () => {
  const makeGlobalVar = (
    name: string,
    overrides: Partial<CallAssociatedDataMap[string]> = {}
  ): CallAssociatedDataMap[string] => ({
    name,
    displayName: name,
    value: 'test-value',
    type: 'STRING',
    agentEditable: false,
    agentViewable: true,
    global: true,
    isSecure: false,
    secureKeyId: '',
    secureKeyVersion: 0,
    ...overrides,
  });

  it('should return agent-viewable global variables', () => {
    const data: CallAssociatedDataMap = {
      Global_Language: makeGlobalVar('Global_Language', {value: 'English'}),
      Global_Region: makeGlobalVar('Global_Region', {value: 'US'}),
    };

    const result = getAgentViewableGlobalVariables(data);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Global_Language');
    expect(result[1].name).toBe('Global_Region');
  });

  it('should exclude variables where agentViewable is false', () => {
    const data: CallAssociatedDataMap = {
      Global_Visible: makeGlobalVar('Global_Visible'),
      Global_Hidden: makeGlobalVar('Global_Hidden', {agentViewable: false}),
    };

    const result = getAgentViewableGlobalVariables(data);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Global_Visible');
  });

  it('should exclude non-global variables', () => {
    const data: CallAssociatedDataMap = {
      Global_Var: makeGlobalVar('Global_Var'),
      LocalCadVar: makeGlobalVar('LocalCadVar', {global: false}),
    };

    const result = getAgentViewableGlobalVariables(data);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Global_Var');
  });

  it('should exclude system CAD keys', () => {
    const data: CallAssociatedDataMap = {};
    SYSTEM_CAD_KEYS.forEach((key) => {
      data[key] = makeGlobalVar(key, {global: true, agentViewable: true});
    });
    data['Global_Custom'] = makeGlobalVar('Global_Custom');

    const result = getAgentViewableGlobalVariables(data);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Global_Custom');
  });

  it('should exclude entries with no name', () => {
    const data: CallAssociatedDataMap = {
      Global_NoName: makeGlobalVar('', {displayName: 'No Name'}),
    };

    const result = getAgentViewableGlobalVariables(data);
    expect(result).toHaveLength(0);
  });

  it('should return empty array for undefined input', () => {
    expect(getAgentViewableGlobalVariables(undefined)).toEqual([]);
  });

  it('should return empty array for null input', () => {
    expect(getAgentViewableGlobalVariables(null as unknown as undefined)).toEqual([]);
  });

  it('should return empty array for non-object input', () => {
    expect(getAgentViewableGlobalVariables('string' as unknown as undefined)).toEqual([]);
  });

  it('should return empty array for empty object', () => {
    expect(getAgentViewableGlobalVariables({})).toEqual([]);
  });
});
