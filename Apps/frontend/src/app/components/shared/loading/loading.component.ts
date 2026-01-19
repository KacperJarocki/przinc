import { Component } from '@angular/core';
import { LoadingService } from '../../../services/loading.service';
import { CommonModule } from '@angular/common';
import { NgxLoadingModule } from 'ngx-loading';

@Component({
  selector: 'app-loading',
  standalone: true,
  imports: [
    CommonModule,
    NgxLoadingModule
  ],
  templateUrl: './loading.component.html'
})
export class LoadingComponent {
  loading: boolean = false;
  loading$ = this.loadingService.loading;

  constructor(private loadingService: LoadingService){ }

  ngOnInit(){
    this.loadingService.loading.subscribe(status =>{
      this.loading = status;
    })
  }
}
