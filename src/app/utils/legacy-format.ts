interface TaskLabelFields {
  priority?: string | number | boolean | null;
  owner?: string | number | boolean | null;
}

export function formatTaskLabel(task: TaskLabelFields | null | undefined): string {
  if (!task) {
    return 'SIN-DATOS';
  }
  const priority = task.priority ? String(task.priority).toUpperCase() : 'NORMAL';
  const owner = task.owner ? String(task.owner).toUpperCase() : 'SIN-ASIGNAR';
  return priority + ' · ' + owner;
}
