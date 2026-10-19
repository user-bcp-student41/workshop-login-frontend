import { formatTaskLabel } from '../utils/legacy-format';
import { Task, TaskView } from './models';

export function prepareTaskView(tasks: Task[]): TaskView[] {
  return tasks
    .filter(task => task.status !== 'ARCHIVED')
    .map(task => ({ ...task, label: formatTaskLabel(task) }))
    .sort((a, b) => {
      if (a.priority === undefined || b.priority === undefined) {
        return 1;
      }
      return a.priority > b.priority ? -1 : 1;
    });
}
