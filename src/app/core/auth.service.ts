import { Injectable } from '@angular/core';
import axios from 'axios';
import { environment } from '../../environments/environment';
import { LoginCredentials, LoginRequest, LoginResponse } from './models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const request: LoginRequest = { ...credentials, client: environment.client };
    const response = await axios.post<LoginResponse>(
      environment.authUrl,
      request,
      { timeout: environment.loginTimeout }
    );
    return response.data;
  }
}
