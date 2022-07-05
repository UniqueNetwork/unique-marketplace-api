import { CanActivate, ExecutionContext, ForbiddenException, HttpStatus, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MarketConfig } from '../../config/market-config';
import { UNAUTHORIZED_ADMIN_ERROR_MESSAGE } from '../constants';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService, @Inject('CONFIG') private config: MarketConfig) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    try {
      const authHeader = req.headers.authorization;
      const bearer = authHeader.split(' ')[0];
      const token = authHeader.split(' ')[1];

      if (bearer !== 'Bearer' || !token) {
        throw new UnauthorizedException('Authorization required');
      }
      const user = this.jwtService.verify(token);
      await this.verifyAddress(user.address);

      req.adminAddress = user.address;

      return true;
    } catch (e) {
      throw new UnauthorizedException(UNAUTHORIZED_ADMIN_ERROR_MESSAGE);
    }
  }
  async verifyAddress(signerAddress) {
    let isAdmin = false;
    const list = this.config.adminList.split(',');
    if (list.length === 0 || this.config.adminList === null || this.config.adminList === '') {
      throw new ForbiddenException({
        statusCode: HttpStatus.FORBIDDEN,
        message: 'Marketplace disabled management for administrators.',
        error: 'Forbidden',
      });
    }
    list.map((value) => {
      if (value.trim() === signerAddress) {
        isAdmin = true;
      }
    });
    if (!isAdmin) {
      throw new UnauthorizedException({
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'Access denied',
        error: 'Unauthorized address',
      });
    }
  }
}
