import { Component, inject, input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-qr',
  template: `
    <figure class="qr">
      <div [innerHTML]="safe()"></div>
      <figcaption>
        <code class="code">{{ code() }}</code>
        <a [href]="url()" target="_blank" rel="noopener">Abrir pase</a>
      </figcaption>
    </figure>
  `,
})
export class QrComponent {
  private readonly sanitizer = inject(DomSanitizer);
  readonly svg = input('');
  readonly url = input('');
  readonly code = input('');
  safe(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.svg());
  }
}
