import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'reactive' },
  {
    path: 'reactive',
    loadComponent: () =>
      import('./pages/reactive-page/reactive-page').then((m) => m.ReactivePage),
  },
  {
    path: 'signals',
    loadComponent: () =>
      import('./pages/signals-page/signals-page').then((m) => m.SignalsPage),
  },
  { path: '**', redirectTo: 'reactive' },
];