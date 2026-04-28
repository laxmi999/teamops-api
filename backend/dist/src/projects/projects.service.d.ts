import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
export declare class ProjectsService {
    create(createProjectDto: CreateProjectDto): string;
    findAll(): string;
    findOne(id: number): string;
    update(id: number, updateProjectDto: UpdateProjectDto): string;
    remove(id: number): string;
}
