import { ForbiddenException, HttpException, HttpStatus, Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Connection, Repository } from 'typeorm';
import { MarketConfig } from '../../config/market-config';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuid } from 'uuid';
import * as util from '../../utils/blockchain/util';
import { ResponseAdminDto } from '../dto/response-admin.dto';
import { AdminSessionEntity } from '../../entity/adminsession-entity';

@Injectable()
export class AdminService {
  private logger: Logger;
  private readonly adminRepository: Repository<AdminSessionEntity>;

  constructor(@Inject('DATABASE_CONNECTION') private connection: Connection, @Inject('CONFIG') private config: MarketConfig, private jwtService: JwtService) {
    this.logger = new Logger(AdminService.name);
    this.adminRepository = connection.manager.getRepository(AdminSessionEntity);
  }

  /**
   * User authorization
   * @param signerAddress
   * @param signature
   * @param queryString
   */
  async login(signerAddress: string): Promise<ResponseAdminDto> {
    this.checkAdministratorAddress(signerAddress);

    const substrateAddress = util.normalizeAccountId(signerAddress);
    const token = await this.generateToken(signerAddress);
    const session = await this.adminRepository.create({
      id: uuid(),
      address: signerAddress,
      substrate_address: substrateAddress,
      access_token: token.accessToken,
      refresh_token: token.refreshToken,
    });
    await this.adminRepository.save(session);
    return token;
  }

  /**
   * Health check
   */
  public get isConnected(): boolean {
    return true;
  }

  /**
   * JWT token generator creates temporary keys
   * @param substrateAddress
   * @private
   */
  private async generateToken(substrateAddress: string): Promise<ResponseAdminDto> {
    const payload = { address: substrateAddress };
    const access = this.jwtService.sign(payload, {
      expiresIn: this.config.jwt.access,
    });

    const refresh = this.jwtService.sign(payload, {
      expiresIn: this.config.jwt.refresh,
    });

    return { accessToken: access, refreshToken: refresh };
  }

  regexNumber(num: string) {
    const regx = /\d+$/;
    if (regx.test(num)) {
      return { isNumber: true, value: parseInt(num) };
    } else {
      return { isNumber: false, value: null };
    }
  }

  private checkAdministratorAddress(signerAddress: string) {
    if (signerAddress === undefined) {
      throw new UnauthorizedException('Unauthorized! Enter your address.');
    }

    let isAdmin = false;

    try {
      if (this.config.adminList === null || this.config.adminList === '') {
        throw new ForbiddenException({
          statusCode: HttpStatus.FORBIDDEN,
          message: 'Marketplace disabled management for administrators.',
          error: 'Forbidden',
        });
      }
      const list = this.config.adminList.split(',');
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
    } catch (e) {
      this.logger.error({ statusCode: e.status, message: e.message, error: e.response?.error });
      throw new HttpException({ statusCode: e.status, message: e.message, error: e.response?.error }, e.status);
    }
  }
}
