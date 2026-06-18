import { Component, computed, input, inject } from '@angular/core';
import { CollabWorkspaceComponent, CollabWorkspaceMode } from './collab-workspace.component';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-collab-workspace-page',
  standalone: true,
  imports: [CollabWorkspaceComponent],
  template: `
    <app-collab-workspace
      [documentId]="documentId()"
      [mode]="mode()"
    />
  `
})
export class CollabWorkspacePageComponent {
  private readonly route = inject(ActivatedRoute);

  readonly documentId = toSignal(
    this.route.paramMap.pipe(
      map((params) => {
        const raw = params.get('id');
        const parsed = raw ? Number(raw) : 0;
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
      }),
    ),
    { initialValue: 0 },
  );

  readonly mode = toSignal(
    this.route.data.pipe(
      map((data) => (data['mode'] === 'join' ? 'join' : 'initialize')),
    ),
    { initialValue: 'initialize' as CollabWorkspaceMode },
  );
}