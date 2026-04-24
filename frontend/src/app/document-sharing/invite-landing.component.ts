import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DocumentSharingService } from './document-sharing.service';

@Component({
  selector: 'app-invite-landing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-[50vh] items-center justify-center">
      <span class="loading loading-spinner loading-lg" aria-label="Processing invite"></span>
    </div>
  `,
})
export class InviteLandingComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sharing = inject(DocumentSharingService);

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token');

    if (!token) {
      void this.router.navigate(['/requests'], { queryParams: { status: 'error' } });
      return;
    }

    this.sharing.useInvite(token).subscribe({
      next: (response) => {
        const status = response.granted ? 'granted' : 'requested';
        void this.router.navigate(['/requests'], { queryParams: { status } });
      },
      error: () => {
        void this.router.navigate(['/requests'], { queryParams: { status: 'error' } });
      },
    });
  }
}