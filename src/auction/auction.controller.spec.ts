import { Test, TestingModule } from '@nestjs/testing';
import { AuctionController } from './auction.controller';

describe('AuctionController', () => {
  let controller: AuctionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuctionController],
    }).compile();

    controller = module.get<AuctionController>(AuctionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
