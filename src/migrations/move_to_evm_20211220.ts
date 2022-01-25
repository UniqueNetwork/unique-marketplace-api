import { MigrationInterface, QueryRunner, Table } from 'typeorm';
import { encodeAddress } from '@polkadot/util-crypto';

import { createSchema, dropSchema } from './helpers';

export class MoveToEvm_20211220000000 implements MigrationInterface {
    async up(queryRunner: QueryRunner): Promise<void> {
        for (let trade of await queryRunner.query(`SELECT * FROM public."Trade" as t ORDER BY t."TradeDate" ASC`)) {
            let offer = await queryRunner.query(`SELECT * FROM public."Offer" as o WHERE o."Id" = $1`, [trade.OfferId]);
            if (!offer.length) continue;
            offer = offer[0];
            let seller = encodeAddress(Buffer.from(offer.Seller, 'base64'));
            let buyer = encodeAddress(Buffer.from(trade.Buyer, 'base64'));

            let newAsk = {
                token_id: offer.TokenId,
                collection_id: offer.CollectionId,
                status: 'bought',
                id: offer.Id,
                address_from: seller,
                address_to: seller,
                network: 'testnet',
                block_number_ask: -1,
                currency: offer.QuoteId,
                price: (BigInt(offer.Price) * 110n) / 100n,
            };

            let newTrade = {
                token_id: offer.TokenId,
                collection_id: offer.CollectionId,
                id: trade.Id,
                buy_created_at: trade.TradeDate,
                ask_created_at: offer.CreationDate,
                block_number_ask: -1,
                block_number_buy: -1,
                network: 'testnet',
                currency: offer.QuoteId,
                price: offer.Price,
                address_seller: seller,
                address_buyer: buyer,
            };

            await queryRunner.manager.createQueryBuilder().insert().into('contract_ask').values(newAsk).execute();
            await queryRunner.manager.createQueryBuilder().insert().into('market_trade').values(newTrade).execute();
        }

        await dropSchema(queryRunner);
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await createSchema(queryRunner);
    }
}
