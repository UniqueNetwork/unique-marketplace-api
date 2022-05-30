import { ForbiddenException, HttpException, HttpStatus, Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Connection, DeleteResult, Repository } from 'typeorm';
import { InjectSentry, SentryService } from '../utils/sentry';
import { MarketConfig } from '../config/market-config';
import { ApiPromise } from '@polkadot/api';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuid } from 'uuid';
import * as util from '../utils/blockchain/util';
import { SignatureVerifier } from '../auction/services/helpers/signature-verifier';
import { ResponseAdminDto, ResponseAdminErrorDto } from './dto/response-admin.dto';
import { AdminSessionEntity } from '../entity/adminsession-entity';
import { CollectionsService } from './collections.service';
import { Collection } from 'src/entity';

@Injectable()
export class AdminService {
  private logger: Logger;
  private readonly adminRepository: Repository<AdminSessionEntity>;
  constructor(
    @InjectSentry() private readonly sentryService: SentryService,
    @Inject('DATABASE_CONNECTION') private connection: Connection,
    @Inject('UNIQUE_API') private uniqueApi: ApiPromise,
    @Inject('CONFIG') private config: MarketConfig,
    private readonly signatureVerifier: SignatureVerifier,
    private jwtService: JwtService,
    private collectionsService: CollectionsService,
  ) {
    this.logger = new Logger(AdminService.name);
    this.adminRepository = connection.manager.getRepository(AdminSessionEntity);
  }

  /**
   * User authorization
   * @param signerAddress
   * @param signature
   * @param queryString
   */
  async login(signerAddress: string, signature: string, queryString: string): Promise<ResponseAdminDto | ResponseAdminErrorDto> {
    this.checkAdministratorAddress(signerAddress, signature);
    try {
      await this.signatureVerifier.verify({
        payload: queryString,
        signature,
        signerAddress,
      });
    } catch (e) {
      throw new UnauthorizedException({ statusCode: e.status, message: e, error: e.response?.error || 'Unauthorized address or bad signature' });
    }

    const substrateAddress = util.normalizeAccountId(signerAddress);
    const token = await this.generateToken(signerAddress, signature);
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
   * List collection
   * @param param
   */
  async listCollection(): Promise<Collection[]> {
    return await this.collectionsService.findAll();
  }

  /**
   * Create collection
   * @param id - collection id from unique network
   */
  async createCollection(collectionId: number): Promise<Collection> {
    return await this.collectionsService.importById(collectionId);
  }

  /**
   * Remove collection
   * @param id - collection id from database
   */
  async removeCollection(collectionId: number): Promise<DeleteResult> {
    return await this.collectionsService.deleteById(collectionId);
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
   * @param pid
   * @private
   */
  private async generateToken(substrateAddress: string, pid: string): Promise<ResponseAdminDto> {
    const payload = { address: substrateAddress };
    const access = this.jwtService.sign(payload, {
      expiresIn: this.config.jwt.access,
    });

    const refresh = this.jwtService.sign(payload, {
      expiresIn: this.config.jwt.refresh,
    });

    return { accessToken: access, refreshToken: refresh };
  }

  private checkAdministratorAddress(signerAddress: string, signature: string) {
    if (signerAddress === undefined) {
      throw new UnauthorizedException('Unauthorized! Enter your address.');
    }

    let isAdmin = false;

    try {
      if (this.config.adminList === null || this.config.adminList === '') {
        throw new ForbiddenException({ statusCode: HttpStatus.FORBIDDEN, message: 'Marketplace disabled management for administrators.', error: 'Forbidden' });
      }
      const list = this.config.adminList.split(',');
      list.map((value) => {
        if (value.trim() === signerAddress) {
          isAdmin = true;
        }
      });
      if (!isAdmin) {
        throw new UnauthorizedException({ statusCode: HttpStatus.UNAUTHORIZED, message: 'Access denied', error: 'Unauthorized address' });
      }
    } catch (e) {
      this.logger.error({ statusCode: e.status, message: e.message, error: e.response?.error });
      throw new HttpException({ statusCode: e.status, message: e.message, error: e.response?.error }, e.status);
    }
  }
}
