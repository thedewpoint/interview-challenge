import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import {
  DB_CLIENT,
  DataClientType,
  NewProjectType,
  PROJECT,
  ProjectType,
  STATUS,
  StatusType,
  TASK,
  TaskType,
} from '@app/data';

import { BoardAggregateDto } from './dtos/aggregate.dto';

interface AggregateResultType {
  project: ProjectType;
  status: StatusType;
  task: TaskType;
}

@Injectable()
export class ProjectRepo {
  constructor(@Inject(DB_CLIENT) private readonly dbClient: DataClientType) {}

  async getProjects(): Promise<ProjectType[]> {
    return await this.dbClient.select().from(PROJECT);
  }
  async getProjectById(id: string): Promise<ProjectType> {
    const [project] = await this.dbClient
      .select()
      .from(PROJECT)
      .where(eq(PROJECT.id, id));
    return project;
  }
  async createProject(project: NewProjectType): Promise<ProjectType> {
    const [result] = await this.dbClient
      .insert(PROJECT)
      .values(project)
      .returning();
    return result;
  }
  async updateProject(project: ProjectType): Promise<ProjectType> {
    const [result] = await this.dbClient
      .update(PROJECT)
      .set(project)
      .where(eq(PROJECT.id, project.id))
      .returning();
    return result;
  }
  async deleteProject(id: string): Promise<void> {
    await this.dbClient.delete(PROJECT).where(eq(PROJECT.id, id));
  }
  async getProjectAggregateById(id: string): Promise<BoardAggregateDto> {
    const results = await this.dbClient
      .select()
      .from(PROJECT)
      .innerJoin(TASK, eq(TASK.projectId, PROJECT.id))
      .innerJoin(STATUS, eq(STATUS.id, TASK.statusId))
      .where(eq(PROJECT.id, id));

    return this.aggregateRecords(results);
  }

  private aggregateRecords(records: AggregateResultType[]): BoardAggregateDto {
    const projectName = records.length > 0 ? records[0].project.name : '';

    const columnsMap: Record<
      string,
      { name: string; id: string; tasks: TaskType[] }
    > = {};
    records.forEach((record) => {
      const { status, task } = record;
      if (!columnsMap[status.id]) {
        columnsMap[status.id] = {
          name: status.name,
          id: status.id,
          tasks: [],
        };
      }

      columnsMap[status.id].tasks.push({
        id: task.id,
        title: task.title,
        description: task.description,
        statusId: task.statusId,
        projectId: task.projectId,
      });
    });

    const columns = Object.values(columnsMap);
    return {
      name: projectName,
      columns,
    };
  }
}
