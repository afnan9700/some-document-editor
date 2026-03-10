import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';

// We strictly type the possible states to avoid unpredictable 'any' or string errors.
export type DocStatus = 'owned' | 'shared' | 'locked' | 'read-only' | 'pending';

@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="badge badge-sm font-medium" [class]="badgeClass()">
      {{ statusText() }}
    </span>
  `
})
export class StatusBadgeComponent {
  // status is passed by the parent component
  status = input.required<DocStatus>();

  // daisyui badge classes based on status
  badgeClass = computed(() => {
    switch(this.status()) {
      case 'owned': return 'badge-neutral';
      case 'shared': return 'badge-info';
      case 'locked': return 'badge-error';
      case 'read-only': return 'badge-warning';
      case 'pending': return 'badge-primary';
      default: return 'badge-ghost';
    }
  });

  // capitalize the first letter of status for display
  statusText = computed(() => {
    const s = this.status();
    return s.charAt(0).toUpperCase() + s.slice(1);
  });
}