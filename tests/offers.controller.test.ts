import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseModule } from '../src/database/module';
import { ConfigModule } from '../src/config/module';
import { OffersController } from '../src/offers/offers.controller';
import { OffersService } from '../src/offers/offers.service';

describe('OffersController', () => {
    let offersController: OffersController;

    beforeEach(async () => {
        const app: TestingModule = await Test.createTestingModule({
            imports: [DatabaseModule, ConfigModule],
            controllers: [OffersController],
            providers: [OffersService],
        }).compile();

        offersController = app.get<OffersController>(OffersController);
    });

    describe('/offers?page=1&pageSize=10&sort=asc(Price)', () => {
        it('find 10 records sort asc(Price)', async () => {
            const response = await offersController.get(
                { page: 1, pageSize: 10 },
                { collectionId: [], traitsCount: [] },
                { sort: [{ order: 0, column: 'Price' }] },
            );
            expect(response.page).toBe(1);
            expect(response.pageSize).toBe(10);
            expect(response.items.length).toStrictEqual(10);
        });
    });
});
