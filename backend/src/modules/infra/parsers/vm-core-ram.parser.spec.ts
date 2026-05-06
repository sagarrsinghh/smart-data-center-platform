import { VmCoreRamParser } from './vm-core-ram.parser';

describe('VmCoreRamParser', () => {
  const parser = new VmCoreRamParser();

  it('parses grouped project rows and inherits the project name', () => {
    const result = parser.parse([
      [
        'SR NO.',
        'PROJECT',
        'PROD / STAG',
        'APP / DB',
        'VM-QUANTITY',
        'Total VMs',
        'CORE',
        'Total CPU',
        'RAM ( GB )',
        'Total RAM',
      ],
      [
        '1',
        'JankalyanPortal',
        'PROD-P4',
        'APP',
        '36',
        '91',
        '564',
        '1190',
        '2168',
        '3684',
      ],
      ['', '', 'PROD-DR', 'DB', '4', '', '44', '', '104', ''],
      ['', '', 'PROD_DR', 'DB', '1', '', '8', '', '16', ''],
      [
        '523',
        'Total',
        '1521',
        '1521',
        '5679',
        '5679',
        '57790',
        '57790',
        '230294',
        '230294',
      ],
    ]);

    expect(result.deployments).toHaveLength(3);
    expect(result.deployments[1].projectName).toBe('JankalyanPortal');
    expect(result.deployments[1].environmentType).toBe('PROD');
    expect(result.deployments[1].locationCode).toBe('DR');
    expect(result.deployments[2].locationCode).toBe('DR');
  });

  it('skips malformed rows without a resolvable project name', () => {
    const result = parser.parse([
      [
        'SR NO.',
        'PROJECT',
        'PROD / STAG',
        'APP / DB',
        'VM-QUANTITY',
        'Total VMs',
        'CORE',
        'Total CPU',
        'RAM ( GB )',
        'Total RAM',
      ],
      ['', '', 'PROD-P4', 'APP', '1', '1', '4', '4', '8', '8'],
    ]);

    expect(result.deployments).toHaveLength(0);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'warning',
          message: expect.stringContaining('project name'),
        }),
      ]),
    );
  });

  it('parses rows using detected columns instead of fixed positions', () => {
    const result = parser.parse(
      [
        [
          'PROJECT',
          'APP / DB',
          'RAM ( GB )',
          'PROD / STAG',
          'CORE',
          'VM-QUANTITY',
        ],
        ['Rajkaj', 'APP', '2035', 'PROD-P4', '603', '35'],
      ],
      { sheetName: 'Sheet1' },
    );

    expect(result.deployments).toHaveLength(1);
    expect(result.deployments[0]).toEqual(
      expect.objectContaining({
        sourceSheet: 'Sheet1',
        projectName: 'Rajkaj',
        workloadType: 'APP',
        vmQuantity: 35,
        core: 603,
        ramGb: 2035,
      }),
    );
  });
});
