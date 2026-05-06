import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ProjectDeployment } from '../../entities/project-deployment.entity';
import { Project } from '../../entities/project.entity';
import { InfraImportsService } from './infra-imports.service';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly importsService: InfraImportsService,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(ProjectDeployment)
    private readonly deploymentRepo: Repository<ProjectDeployment>,
  ) {}

  async summary() {
    const batch = await this.requireActiveBatch();
    const deployments = await this.deploymentRepo.find({
      where: { batch: { id: batch.id } },
      relations: ['project'],
    });

    const projectMap = new Map<
      number,
      {
        projectId: number;
        projectName: string;
        totalVms: number;
        totalCpu: number;
        totalRamGb: number;
      }
    >();
    const environmentSplit = new Map<string, number>();
    const workloadSplit = new Map<string, number>();

    deployments.forEach((deployment) => {
      const current = projectMap.get(deployment.project.id) || {
        projectId: deployment.project.id,
        projectName: deployment.project.displayName,
        totalVms: 0,
        totalCpu: 0,
        totalRamGb: 0,
      };

      current.totalVms += Number(
        deployment.totalVms || deployment.vmQuantity || 0,
      );
      current.totalCpu += Number(deployment.totalCpu || 0);
      current.totalRamGb += Number(deployment.totalRamGb || 0);
      projectMap.set(deployment.project.id, current);

      environmentSplit.set(
        deployment.environmentType,
        (environmentSplit.get(deployment.environmentType) || 0) + 1,
      );
      workloadSplit.set(
        deployment.workloadType,
        (workloadSplit.get(deployment.workloadType) || 0) + 1,
      );
    });

    const projects = Array.from(projectMap.values())
      .map((item) => ({
        ...item,
        totalCpu: Number(item.totalCpu.toFixed(2)),
        totalRamGb: Number(item.totalRamGb.toFixed(2)),
      }))
      .sort((left, right) => right.totalCpu - left.totalCpu);

    return {
      activeImportId: batch.id,
      totalProjects: projects.length,
      totalDeployments: deployments.length,
      totalVms: projects.reduce((sum, project) => sum + project.totalVms, 0),
      totalCpu: Number(
        projects.reduce((sum, project) => sum + project.totalCpu, 0).toFixed(2),
      ),
      totalRamGb: Number(
        projects
          .reduce((sum, project) => sum + project.totalRamGb, 0)
          .toFixed(2),
      ),
      environmentSplit: Array.from(environmentSplit.entries()).map(
        ([environment, count]) => ({
          environment,
          count,
        }),
      ),
      workloadSplit: Array.from(workloadSplit.entries()).map(
        ([workloadType, count]) => ({
          workloadType,
          count,
        }),
      ),
      topProjects: projects.slice(0, 10),
    };
  }

  async deployments(filters?: Record<string, string>) {
    const batch = await this.requireActiveBatch();
    const query = this.deploymentRepo
      .createQueryBuilder('deployment')
      .leftJoinAndSelect('deployment.project', 'project')
      .where('deployment.batchId = :batchId', { batchId: batch.id })
      .orderBy('project.displayName', 'ASC')
      .addOrderBy('deployment.sourceRowNumber', 'ASC');

    if (filters?.environment) {
      query.andWhere('deployment.environmentType = :environment', {
        environment: filters.environment,
      });
    }

    if (filters?.location) {
      query.andWhere('deployment.locationCode = :location', {
        location: filters.location,
      });
    }

    if (filters?.workload) {
      query.andWhere('deployment.workloadType = :workload', {
        workload: filters.workload,
      });
    }

    if (filters?.project) {
      query.andWhere('project.displayName LIKE :project', {
        project: `%${filters.project}%`,
      });
    }

    const data = await query.getMany();

    return {
      count: data.length,
      data,
    };
  }

  async topConsumers() {
    const summary = await this.summary();
    return {
      topByCpu: summary.topProjects.slice(0, 5),
      topByRam: [...summary.topProjects]
        .sort((left, right) => right.totalRamGb - left.totalRamGb)
        .slice(0, 5),
      topByVms: [...summary.topProjects]
        .sort((left, right) => right.totalVms - left.totalVms)
        .slice(0, 5),
    };
  }

  private async requireActiveBatch() {
    const batch = await this.importsService.getActiveBatch();
    if (!batch) {
      throw new NotFoundException('No active workbook snapshot found.');
    }

    return batch;
  }
}
