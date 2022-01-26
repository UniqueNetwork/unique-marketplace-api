import { Test, TestingModule } from '@nestjs/testing';
import { AuctionClosedService } from './auction-closed.service';

describe('AuctionClosedService', () => {
  let service: AuctionClosedService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuctionClosedService],
    }).compile();

    service = module.get<AuctionClosedService>(AuctionClosedService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
