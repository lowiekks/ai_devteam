import { Component } from '@angular/core';
import { Sidebar } from '../../components/sidebar/sidebar';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [Sidebar],
  templateUrl: './analytics.html',
  styleUrl: './analytics.scss',
})
export class Analytics {}
