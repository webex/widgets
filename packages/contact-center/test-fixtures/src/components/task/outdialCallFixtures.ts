import {mockCC} from '../../fixtures';

export const mockOutdialCallProps = {
  ...mockCC,
  startOutdial: jest.fn().mockResolvedValue('Success'),
  getOutdialANIEntries: jest.fn().mockReturnValue([]),
};

export const mockAniEntries = [
  {
    organizationId: 'org1',
    id: 'ani1',
    version: 1,
    name: 'Main Line',
    number: '+1234567890',
    createdTime: 1640995200000,
    lastUpdatedTime: 1640995200000,
  },
  {
    organizationId: 'org1',
    id: 'ani2',
    version: 1,
    name: 'Support Line',
    number: '+1987654321',
    createdTime: 1640995200000,
    lastUpdatedTime: 1640995200000,
  },
];

export const mockCCWithAni = {
  ...mockCC,
  agentConfig: {
    ...mockCC.agentConfig,
    outdialANIId: 'test-ani-id',
  },
  getOutdialAniEntries: jest.fn().mockResolvedValue({
    data: mockAniEntries,
    meta: {
      page: 0,
      pageSize: 25,
      total: 2,
      totalPages: 1,
    },
  }),
};
