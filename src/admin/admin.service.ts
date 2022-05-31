import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Connection, Repository } from 'typeorm';
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
import { IsNumber } from 'class-validator';

@Injectable()
export class AdminService {
  private logger: Logger;
  private readonly adminRepository: Repository<AdminSessionEntity>;
  constructor(
    @InjectSentry() private readonly sentryService: SentryService,
    @Inject('DATABASE_CONNECTION') private connection: Connection,
    @Inject('UNIQUE_API') private uniqueApi: any,
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
   * @return ({Promise<Collection[]>})
   */
  async listCollection(): Promise<Collection[]> {
    return await this.collectionsService.findAll();
  }

  /**
   * Create collection
   * @param id - collection id from unique network
   * @return ({Promise<Collection>})
   */
  async createCollection(collectionId: number): Promise<Collection> {
    return await this.collectionsService.importById(collectionId);
  }

  /**
   * Remove collection
   * @param id - collection id from database
   * @return ({Promise<Collection>})
   */
  async removeCollection(collectionId: number): Promise<Collection> {
    return await this.collectionsService.deleteById(collectionId);
  }

  /**
   * Add allowed token for collection
   */
  async addTokens(collection: string, data: { tokens: string }): Promise<any> {
    const reg = /^[0-9-,]*$/;
    if (!reg.test(data.tokens)) {
      throw new BadRequestException('Wrong format insert tokens');
    }
    // Checkout collection
    const collectionId = await this.collectionsService.findById(+collection);
    if (collectionId === undefined) throw new NotFoundException('Collection not found');
    // Create list tokens
    const tokenList = await this.calculateTokens(data.tokens, reg);
    let collectionTokens = [];
    for (let token of tokenList.values()) {
      let owner = (await this.uniqueApi.rpc.unique.tokenOwner(+collectionId.id, token)).toJSON();
      collectionTokens.push({ collection_id: +collectionId.id, token_id: token, owner_token: owner });
    }
    collectionTokens.sort((a, b) => a.token_id - b.token_id);
    return collectionTokens;
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

  regexNumber(num: string) {
    const regx = /\d+$/;
    if (regx.test(num)) {
      return { isNumber: true, value: parseInt(num) };
    } else {
      return { isNumber: false, value: null };
    }
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

  private async calculateTokens(tokens: string, regex: RegExp): Promise<Set<number>> {
    const array = tokens.match(regex)[0];
    const arr = array.split(',');
    const allTokens = new Set<number>();
    arr.forEach((token) => {
      let rangeNum = token.split('-');
      if (rangeNum.length > 1) {
        for (let i = parseInt(rangeNum[0]); i < parseInt(rangeNum[1]) + 1; i++) {
          allTokens.add(i);
        }
      } else {
        allTokens.add(parseInt(token));
      }
    });
    return allTokens;
  }
}
