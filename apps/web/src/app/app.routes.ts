import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login.page').then((m) => m.LoginPageComponent) },
  { path: 'entrar', loadComponent: () => import('./pages/login.page').then((m) => m.LoginPageComponent) },
  { path: 'registro', loadComponent: () => import('./pages/register.page').then((m) => m.RegisterPageComponent) },
  { path: 'pase/:code', loadComponent: () => import('./pages/pass-public.page').then((m) => m.PassPublicPageComponent) },
  {
    path: '',
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', loadComponent: () => import('./pages/home.page').then((m) => m.HomePageComponent) },
      { path: 'colmenares', loadComponent: () => import('./pages/yards.page').then((m) => m.YardsPageComponent) },
      { path: 'colmenares/:slug', loadComponent: () => import('./pages/yard-detail.page').then((m) => m.YardDetailPageComponent) },
      { path: 'bono', loadComponent: () => import('./pages/products.page').then((m) => m.ProductsPageComponent) },
      { path: 'checkout', canActivate: [authGuard], loadComponent: () => import('./pages/checkout.page').then((m) => m.CheckoutPageComponent) },
      { path: 'confirmacion/:code', canActivate: [authGuard], loadComponent: () => import('./pages/confirm.page').then((m) => m.ConfirmPageComponent) },
      { path: 'mis-pases', canActivate: [authGuard], loadComponent: () => import('./pages/my-passes.page').then((m) => m.MyPassesPageComponent) },
      { path: 'mis-pases/:code', canActivate: [authGuard], loadComponent: () => import('./pages/pass-detail.page').then((m) => m.PassDetailPageComponent) },
      { path: 'sello', canActivate: [authGuard], loadComponent: () => import('./pages/stamp.page').then((m) => m.StampPageComponent) },
      { path: 'mielada', loadComponent: () => import('./pages/harvest.page').then((m) => m.HarvestPageComponent) },
      { path: 'perfil', canActivate: [authGuard], loadComponent: () => import('./pages/profile.page').then((m) => m.ProfilePageComponent) },
      { path: 'staff', canActivate: [authGuard, roleGuard(['staff', 'admin'])], loadComponent: () => import('./pages/staff.page').then((m) => m.StaffPageComponent) },
      { path: 'staff/escanear', canActivate: [authGuard, roleGuard(['staff', 'admin'])], loadComponent: () => import('./pages/staff-scan.page').then((m) => m.StaffScanPageComponent) },
      { path: 'staff/dia', canActivate: [authGuard, roleGuard(['staff', 'admin'])], loadComponent: () => import('./pages/staff-day.page').then((m) => m.StaffDayPageComponent) },
      { path: 'admin', canActivate: [authGuard, roleGuard(['admin', 'staff'])], loadComponent: () => import('./pages/admin.page').then((m) => m.AdminPageComponent) },
      { path: '**', loadComponent: () => import('./pages/not-found.page').then((m) => m.NotFoundPageComponent) },
    ],
  },
];
