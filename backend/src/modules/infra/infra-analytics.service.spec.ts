import { InfraAnalyticsService } from './infra-analytics.service';

describe('InfraAnalyticsService', () => {
  it('builds workload split from row-level CPU usage instead of project total CPU', async () => {
    const service = new InfraAnalyticsService(
      { getActiveBatch: jest.fn().mockResolvedValue({ id: 1 }) } as any,
      {
        find: jest.fn().mockResolvedValue([
          {
            project: { normalizedName: 'rajkaj', displayName: 'Rajkaj' },
            locationCode: 'P4',
            environmentType: 'PROD',
            workloadType: 'APP',
            totalCpu: 1932,
            totalRamGb: 8808,
            totalVms: 179,
            vmQuantity: 86,
            core: 876,
          },
          {
            project: { normalizedName: 'rajkaj', displayName: 'Rajkaj' },
            locationCode: 'P4',
            environmentType: 'PROD',
            workloadType: 'DB',
            totalCpu: null,
            totalRamGb: null,
            totalVms: null,
            vmQuantity: 14,
            core: 400,
          },
        ]),
      } as any,
      { find: jest.fn().mockResolvedValue([]) } as any,
      { find: jest.fn().mockResolvedValue([]) } as any,
    );

    const result = await service.dashboard();

    expect(result.topProjects[0]).toEqual(
      expect.objectContaining({
        projectName: 'Rajkaj',
        cpuUsage: 1932,
      }),
    );
    expect(result.workloadDistribution).toEqual([
      { workloadType: 'APP', cpuUsage: 876 },
      { workloadType: 'DB', cpuUsage: 400 },
    ]);
    expect(result.environmentDistribution).toEqual([
      { environmentType: 'PROD', cpuUsage: 1276 },
    ]);
  });
});
