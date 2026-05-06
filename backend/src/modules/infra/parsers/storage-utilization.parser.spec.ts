import { StorageUtilizationParser } from './storage-utilization.parser';

describe('StorageUtilizationParser', () => {
  const parser = new StorageUtilizationParser();

  it('maps storage rows to the current location section and skips totals', () => {
    const result = parser.parse([
      ['RSDC-P1'],
      [
        'Device Name',
        'OEM',
        'Model',
        'Total Capacity (TB)',
        'Used Capacity (TB)',
        'Unused Capacity (TB)',
        'Allocated Capacity(TB)',
        'Remarks',
      ],
      [
        'Hitachi Storage',
        'Hitachi',
        'VSP',
        '258.95',
        '212.91',
        '46.04',
        '248.44',
        '',
      ],
      ['TOTAL', '', '', '599.24', '520.42', '78.82', '556.43', ''],
      ['RSDC-DR'],
      [
        'DoIT_RSDCP3_Cluster1',
        'NETAPP',
        '8040',
        '411.42',
        '352.11',
        '59.31',
        '873.44',
        '',
      ],
    ]);

    expect(result.assets).toHaveLength(2);
    expect(result.assets[0].locationCode).toBe('RSDC-P1');
    expect(result.assets[1].locationCode).toBe('RSDC-DR');
    expect(result.assets[0].totalCapacityTb).toBe(258.95);
  });

  it('records a warning if a storage row appears before any location section', () => {
    const result = parser.parse([
      [
        'Device Name',
        'OEM',
        'Model',
        'Total Capacity (TB)',
        'Used Capacity (TB)',
        'Unused Capacity (TB)',
        'Allocated Capacity(TB)',
        'Remarks',
      ],
      [
        'Hitachi Storage',
        'Hitachi',
        'VSP',
        '258.95',
        '212.91',
        '46.04',
        '248.44',
        '',
      ],
    ]);

    expect(result.assets).toHaveLength(0);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'warning',
          message: expect.stringContaining('no active location section'),
        }),
      ]),
    );
  });

  it('detects uppercase headers and does not import header rows as assets', () => {
    const result = parser.parse(
      [
        ['RSDC-P4', '', '', '', '', '', '', ''],
        [
          'DEVICE NAME',
          'OEM',
          'Model',
          'Total Capacity(TB)',
          'Used Capacity (TB)',
          'Unused Capacity (TB)',
          'Allocated Capacity(TB)',
          'Remarks',
        ],
        [
          'BSDC-METRO-CLUSTER-01',
          'NETAPP',
          '9500',
          '1975.37',
          '1274.34',
          '701.03',
          '2258.05',
          '',
        ],
      ],
      { sheetName: 'Sheet2' },
    );

    expect(result.assets).toHaveLength(1);
    expect(result.assets[0]).toEqual(
      expect.objectContaining({
        sourceSheet: 'Sheet2',
        locationCode: 'RSDC-P4',
        deviceName: 'BSDC-METRO-CLUSTER-01',
        totalCapacityTb: 1975.37,
      }),
    );
  });
});
