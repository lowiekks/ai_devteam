import { Component } from '@angular/core';
import { Sidebar } from '../../components/sidebar/sidebar';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [Sidebar],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class Settings {}
