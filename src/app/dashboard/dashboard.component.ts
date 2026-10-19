import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SessionUser, Task, TaskView } from '../core/models';
import { SessionService } from '../core/session.service';
import { TasksService } from '../core/tasks.service';
import { prepareTaskView } from '../core/task-view';
import { httpErrorMessage } from '../core/http-error-message';

const STATUS_LABELS: Record<string, string> = {
  TODO: 'Por hacer',
  IN_PROGRESS: 'En progreso',
  DONE: 'Completado',
  RESUELTO: 'Resuelto',
  COMPLETED: 'Completado'
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  tasks: Task[] = [];
  visibleTasks: TaskView[] = [];
  user: SessionUser = {};
  loading = true;
  error = '';

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
    private session: SessionService,
    private taskService: TasksService
  ) {}

  statusLabel(status?: string): string {
    const value = status || '';
    return STATUS_LABELS[value.toUpperCase()] || value;
  }

  async ngOnInit(): Promise<void> {
    const token = this.session.getToken();
    this.user = this.session.getUser();
    if (!token) {
      await this.router.navigate(['/login']);
      return;
    }
    try {
      const tasks = await this.taskService.load(this.user.username || '', token);
      const visibleTasks = prepareTaskView(tasks);
      // axios resuelve a veces fuera de la zona de Angular (más aún llegando
      // por navegación desde el login): forzamos volver a entrar a la zona
      // y disparamos detectChanges a mano para no depender de que Angular
      // lo detecte solo.
      this.zone.run(() => {
        this.tasks = tasks;
        this.visibleTasks = visibleTasks;
        this.loading = false;
        this.cdr.detectChanges();
      });
    } catch (error: unknown) {
      this.zone.run(() => {
        this.error = httpErrorMessage(error, 'tasks');
        this.loading = false;
        this.cdr.detectChanges();
      });
    }
  }

  async logout(): Promise<void> {
    this.session.clear();
    await this.router.navigate(['/login']);
  }
}
