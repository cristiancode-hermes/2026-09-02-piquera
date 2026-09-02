import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API, Addon, Harvest, HomeDto, Pass, PassProduct, Yard } from '../shared/models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  home() {
    return this.http.get<HomeDto>(`${API}/home`);
  }
  yards() {
    return this.http.get<{ items: Yard[] }>(`${API}/yards`);
  }
  yard(slug: string) {
    return this.http.get<Yard>(`${API}/yards/${slug}`);
  }
  products() {
    return this.http.get<{ items: PassProduct[] }>(`${API}/products`);
  }
  addons() {
    return this.http.get<{ items: Addon[] }>(`${API}/addons`);
  }
  checkout(body: { productId: string; addonIds: string[] }) {
    return this.http.post<Pass>(`${API}/passes/checkout`, body);
  }
  mine() {
    return this.http.get<{ items: Pass[] }>(`${API}/passes/mine`);
  }
  myPass(code: string) {
    return this.http.get<Pass>(`${API}/passes/mine/${code}`);
  }
  publicPass(code: string) {
    return this.http.get<Pass>(`${API}/passes/by-code/${code}`);
  }
  cancel(id: string) {
    return this.http.post<Pass>(`${API}/passes/${id}/cancel`, {});
  }
  myCheckIns() {
    return this.http.get<{ items: any[]; series14d: { date: string; count: number }[] }>(`${API}/check-ins/mine`);
  }
  stamp(yardId: string) {
    return this.http.post(`${API}/check-ins`, { yardId });
  }
  harvest() {
    return this.http.get<Harvest | null>(`${API}/harvests/current`);
  }
  claim(id: string) {
    return this.http.post(`${API}/harvests/${id}/claim`, {});
  }
  staffToday() {
    return this.http.get<any>(`${API}/staff/today`);
  }
  scan(body: { codeOrUrl: string; yardId?: string; action?: string }) {
    return this.http.post<any>(`${API}/staff/scan`, body);
  }
  patchYardDay(yardId: string, body: { status: string; capacityOverride?: number }) {
    return this.http.patch(`${API}/staff/yard-days/${yardId}`, body);
  }
  adminStats() {
    return this.http.get<any>(`${API}/admin/stats`);
  }
}
