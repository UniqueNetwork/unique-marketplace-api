import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MarketConfig } from '../../config/market-config';
import { Keyring } from '@polkadot/api';

@Injectable()
export class MainSaleSeedGuard implements CanActivate {
  constructor(private jwtService: JwtService, @Inject('CONFIG') private config: MarketConfig) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    const { adminAddress } = req;

    const { mainSaleSeed } = this.config;

    const keyring = new Keyring({ type: 'sr25519' });

    const signer = keyring.addFromUri(mainSaleSeed);

    const mainSaleSeedAddress = signer.address;

    if (mainSaleSeedAddress === adminAddress) return true;

    throw new UnauthorizedException(`Only for ${mainSaleSeedAddress}`);
  }
}
