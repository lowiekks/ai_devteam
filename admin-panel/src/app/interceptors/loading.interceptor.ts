/**
 * HTTP Loading Interceptor
 * Shows global loading indicator during HTTP requests
 */

import { Injectable, inject } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpResponse,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, finalize, tap } from 'rxjs';

@Injectable()
export class LoadingInterceptor implements HttpInterceptor {
  private activeRequests = 0;

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    // Increment active requests
    this.activeRequests++;
    this.updateLoadingState(true);

    return next.handle(request).pipe(
      tap({
        next: (event) => {
          if (event instanceof HttpResponse) {
            this.decrementRequests();
          }
        },
        error: (error: HttpErrorResponse) => {
          this.decrementRequests();
        },
      }),
      finalize(() => {
        // Fallback decrement
        if (this.activeRequests > 0) {
          this.decrementRequests();
        }
      })
    );
  }

  private decrementRequests(): void {
    this.activeRequests--;
    if (this.activeRequests === 0) {
      this.updateLoadingState(false);
    }
  }

  private updateLoadingState(loading: boolean): void {
    // Emit loading state
    // You can use a service or store to manage global loading state
    // Example: this.loadingService.setLoading(loading);
  }
}
