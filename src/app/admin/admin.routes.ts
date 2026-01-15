import { Routes } from '@angular/router'
import { adminGuard, authGuard } from '../guards/auth.guard'

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authGuard, adminGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./admin-dashboard.component').then(m => m.AdminDashboardComponent),
      },
      {
        path: 'users',
        loadComponent: () => import('./admin-users.component').then(m => m.AdminUsersComponent),
      },
      {
        path: 'pollutions',
        loadComponent: () =>
          import('./admin-pollutions.component').then(m => m.AdminPollutionsComponent),
      },
    ],
  },
]
