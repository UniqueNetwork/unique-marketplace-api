import { Test, TestingModule } from '@nestjs/testing';
import { TradesController } from '../src/trades/trades.controller';
import { TradesService } from '../src/trades/trades.service';
import { DatabaseModule } from '../src/database/module';
import { ConfigModule } from '../src/config/module';

describe('TradesController', () => {
    let tradesController: TradesController;

    beforeEach(async () => {
        const app: TestingModule = await Test.createTestingModule({
            imports: [DatabaseModule, ConfigModule],
            controllers: [TradesController],
            providers: [TradesService],
        }).compile();

        tradesController = app.get<TradesController>(TradesController);
    });

    describe('get page: 1 pageSize: 10 sort asc(Price)', () => {
        it('find 10 records', async () => {
            const response = await tradesController.get({ page: 1, pageSize: 10 }, { sort: [{ order: 0, column: 'Price' }] });
            expect(response.page).toBe(1);
            expect(response.pageSize).toBe(10);
            expect(response.items.length).toStrictEqual(10);
        });
    });
});
