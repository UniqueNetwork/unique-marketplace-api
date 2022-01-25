import {QueryRunner, Table} from "typeorm";

export const createSchema = async (queryRunner: QueryRunner) => {
  let oldInstallation = await queryRunner.hasTable("__EFMigrationsHistory");
  let latestOldInstallation = false;
  if (oldInstallation) {
    let migrationsList = (await queryRunner.query('SELECT "MigrationId" FROM "__EFMigrationsHistory"')).map(x => x.MigrationId);
    latestOldInstallation = migrationsList.length == 18 && migrationsList.indexOf('20210806043509_FixedTokensSearchIndexing') > -1;
  }
  if (oldInstallation && !latestOldInstallation) {
    throw Error('Your installation can not be updated automatically. Update to unique-marketplace-api 0.4 first and run migrations (Just run application to do that)');
  }
  if (oldInstallation) {
    await queryRunner.dropTable("__EFMigrationsHistory");
    return;
  }
  await queryRunner.createTable(new Table({
    name: "KusamaProcessedBlock",
    columns: [
      {
        name: "BlockNumber",
        type: "numeric",
        isPrimary: true,
        precision: 20,
        scale: 0
      },
      {
        name: "ProcessDate",
        type: "timestamp without time zone"
      }
    ]
  }));

  await queryRunner.createTable(new Table({
    name: "UniqueProcessedBlock",
    columns: [
      {
        name: "BlockNumber",
        type: "numeric",
        isPrimary: true,
        precision: 20,
        scale: 0
      },
      {
        name: "ProcessDate",
        type: "timestamp without time zone"
      }
    ]
  }));

  await queryRunner.createTable(new Table({
    name: "Offer",
    indices: [
      {
        name: "IX_Offer_OfferStatus_CollectionId_TokenId",
        columnNames: ["OfferStatus", "CollectionId", "TokenId"]
      },
      {
        name: "IX_Offer_CreationDate",
        columnNames: ["CreationDate"]
      },
      {
        name: "IX_Offer_Metadata",
        columnNames: ["Metadata"]
      }
    ],
    columns: [
      {
        name: "Id",
        type: "uuid",
        isPrimary: true
      },
      {
        name: "CreationDate",
        type: "timestamp without time zone"
      },
      {
        name: "CollectionId",
        type: "numeric",
        precision: 20,
        scale: 0
      },
      {
        name: "TokenId",
        type: "numeric",
        precision: 20,
        scale: 0
      },
      {
        name: "Price",
        type: "text"
      },
      {
        name: "Seller",
        type: "text"
      },
      {
        name: "OfferStatus",
        type: "integer"
      },
      {
        name: "SellerPublicKeyBytes",
        type: "bytea",
        default: "'\\x'::bytea"
      },
      {
        name: "QuoteId",
        type: "numeric",
        precision: 20,
        scale: 0,
        default: '2.0'
      },
      {
        name: "Metadata",
        type: "jsonb",
        isNullable: true
      }
    ]
  }));

  await queryRunner.createTable(new Table({
    name: "NftIncomingTransaction",
    indices: [
      {
        name: "IX_NftIncomingTransaction_Status_LockTime",
        columnNames: ["Status", "LockTime"],
        where: '("Status" = 0)'
      },
      {
        name: "IX_NftIncomingTransaction_OfferId",
        columnNames: ["OfferId"]
      },
      {
        name: "IX_NftIncomingTransaction_UniqueProcessedBlockId",
        columnNames: ["UniqueProcessedBlockId"]
      }
    ],
    foreignKeys: [
      {
        name: "FK_NftIncomingTransaction_Offer_OfferId",
        columnNames: ["OfferId"],
        referencedColumnNames: ["Id"],
        referencedTableName: "Offer",
        onDelete: "RESTRICT"
      },
      {
        name: "FK_NftIncomingTransaction_UniqueProcessedBlock_UniqueProcessed~",
        columnNames: ["UniqueProcessedBlockId"],
        referencedColumnNames: ["BlockNumber"],
        referencedTableName: "UniqueProcessedBlock",
        onDelete: "CASCADE"
      }
    ],
    columns: [
      {
        name: "Id",
        type: "uuid",
        isPrimary: true
      },
      {
        name: "CollectionId",
        type: "bigint"
      },
      {
        name: "TokenId",
        type: "bigint"
      },
      {
        name: "Value",
        type: "text"
      },
      {
        name: "OwnerPublicKey",
        type: "text"
      },
      {
        name: "Status",
        type: "integer"
      },
      {
        name: "LockTime",
        type: "timestamp without time zone",
        isNullable: true
      },
      {
        name: "ErrorMessage",
        type: "text",
        isNullable: true
      },
      {
        name: "UniqueProcessedBlockId",
        type: "numeric",
        precision: 20,
        scale: 0
      },
      {
        name: "OfferId",
        type: "uuid",
        isNullable: true
      }
    ]
  }));

  await queryRunner.createTable(new Table({
    name: "NftOutgoingTransaction",
    indices: [
      {
        name: "IX_NftOutgoingTransaction_Status_LockTime",
        columnNames: ["Status", "LockTime"],
        where: '("Status" = 0)'
      }
    ],
    columns: [
      {
        name: "Id",
        type: "uuid",
        isPrimary: true
      },
      {
        name: "CollectionId",
        type: "numeric",
        precision: 20,
        scale: 0
      },
      {
        name: "TokenId",
        type: "numeric",
        precision: 20,
        scale: 0
      },
      {
        name: "Value",
        type: "text"
      },
      {
        name: "RecipientPublicKey",
        type: "text"
      },
      {
        name: "Status",
        type: "integer"
      },
      {
        name: "LockTime",
        type: "timestamp without time zone",
        isNullable: true
      },
      {
        name: "ErrorMessage",
        type: "text",
        isNullable: true
      }
    ]
  }));

  await queryRunner.createTable(new Table({
    name: "TokenTextSearch",
    indices: [
      {
        name: "IX_TokenTextSearch_CollectionId_TokenId_Locale",
        columnNames: ["CollectionId", "TokenId", "Locale"]
      }
    ],
    columns: [
      {
        name: "Id",
        type: "uuid",
        isPrimary: true
      },
      {
        name: "CollectionId",
        type: "numeric",
        precision: 20,
        scale: 0
      },
      {
        name: "TokenId",
        type: "numeric",
        precision: 20,
        scale: 0
      },
      {
        name: "Text",
        type: "text"
      },
      {
        name: "Locale",
        type: "text",
        isNullable: true
      }
    ]
  }));

  await queryRunner.createTable(new Table({
    name: "Trade",
    indices: [
      {
        name: "IX_Trade_OfferId",
        columnNames: ["OfferId"]
      }
    ],
    foreignKeys: [
      {
        name: "FK_Trade_Offer_OfferId",
        columnNames: ["OfferId"],
        referencedTableName: "Offer",
        referencedColumnNames: ["Id"],
        onDelete: "CASCADE"
      }
    ],
    columns: [
      {
        name: "Id",
        type: "uuid",
        isPrimary: true
      },
      {
        name: "TradeDate",
        type: "timestamp without time zone"
      },
      {
        name: "Buyer",
        type: "text"
      },
      {
        name: "OfferId",
        type: "uuid"
      }
    ]
  }));

  await queryRunner.createTable(new Table({
    name: "QuoteIncomingTransaction",
    indices: [
      {
        name: "IX_QuoteIncomingTransaction_AccountPublicKey",
        columnNames: ["AccountPublicKey"]
      },
      {
        name: "IX_QuoteIncomingTransaction_Status_LockTime",
        columnNames: ["Status", "LockTime"],
        where: '("Status" = 0)'
      }
    ],
    columns: [
      {
        name: "Id",
        type: "uuid",
        isPrimary: true
      },
      {
        name: "Amount",
        type: "text"
      },
      {
        name: "QuoteId",
        type: "numeric",
        precision: 20,
        scale: 0
      },
      {
        name: "Description",
        type: "text"
      },
      {
        name: "AccountPublicKey",
        type: "text"
      },
      {
        name: "BlockId",
        type: "numeric",
        isNullable: true,
        precision: 20,
        scale: 0
      },
      {
        name: "Status",
        type: "integer"
      },
      {
        name: "LockTime",
        type: "timestamp without time zone",
        isNullable: true
      },
      {
        name: "ErrorMessage",
        type: "text",
        isNullable: true
      }
    ]
  }));

  await queryRunner.createTable(new Table({
    name: "QuoteOutgoingTransaction",
    indices: [
      {
        name: "IX_QuoteOutgoingTransaction_Status",
        columnNames: ["Status"],
        where: '("Status" = 0)'
      }
    ],
    columns: [
      {
        name: "Id",
        type: "uuid",
        isPrimary: true
      },
      {
        name: "Status",
        type: "integer"
      },
      {
        name: "ErrorMessage",
        type: "text",
        isNullable: true
      },
      {
        name: "Value",
        type: "text"
      },
      {
        name: "QuoteId",
        type: "numeric",
        precision: 20,
        scale: 0
      },
      {
        name: "RecipientPublicKey",
        type: "text"
      },
      {
        name: "WithdrawType",
        type: "Integer",
        default: "0"
      }
    ]
  }));
}
export const dropSchema = async (queryRunner: QueryRunner) => {
  await queryRunner.dropIndex("QuoteOutgoingTransaction", "IX_QuoteOutgoingTransaction_Status");
  await queryRunner.dropTable("QuoteOutgoingTransaction");

  for (let idx of ["IX_QuoteIncomingTransaction_Status_LockTime", "IX_QuoteIncomingTransaction_AccountPublicKey"]) {
    await queryRunner.dropIndex("QuoteIncomingTransaction", idx);
  }
  await queryRunner.dropTable("QuoteIncomingTransaction");

  await queryRunner.dropForeignKey("Trade", "FK_Trade_Offer_OfferId");
  await queryRunner.dropIndex("Trade", "IX_Trade_OfferId");
  await queryRunner.dropTable("Trade");

  await queryRunner.dropIndex("TokenTextSearch", "IX_TokenTextSearch_CollectionId_TokenId_Locale");
  await queryRunner.dropTable("TokenTextSearch");

  await queryRunner.dropIndex("NftOutgoingTransaction", "IX_NftOutgoingTransaction_Status_LockTime");
  await queryRunner.dropTable("NftOutgoingTransaction");

  for (let fk of ["FK_NftIncomingTransaction_UniqueProcessedBlock_UniqueProcessed~", "FK_NftIncomingTransaction_Offer_OfferId"]) {
    await queryRunner.dropForeignKey("NftIncomingTransaction", fk);
  }
  for (let idx of ["IX_NftIncomingTransaction_UniqueProcessedBlockId", "IX_NftIncomingTransaction_OfferId", "IX_NftIncomingTransaction_Status_LockTime"]) {
    await queryRunner.dropIndex("NftIncomingTransaction", idx);
  }
  await queryRunner.dropTable("NftIncomingTransaction");

  for (let idx of ["IX_Offer_Metadata", "IX_Offer_CreationDate", "IX_Offer_OfferStatus_CollectionId_TokenId"]) {
    await queryRunner.dropIndex("Offer", idx);
  }
  await queryRunner.dropTable("Offer");

  await queryRunner.dropTable("UniqueProcessedBlock");
  await queryRunner.dropTable("KusamaProcessedBlock");
}