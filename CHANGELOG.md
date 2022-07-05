#### 1.6.14 (2022-07-05)

##### Documentation Changes

* **MAR-685:**  updating documentation on the mass cancellation of auctions and offers (62b85211)

##### New Features

*  Command chekout config, deploy contract and collection show (e3d5dcd3)
*  Command chekout config (44627efa)
*  Command deploy contract (478257eb)
* (command) Display collection and token (4a436465)
*  close secondary market offers on primary market initialize (38d68f3c)
*  Updated filter (7369634d)
*  update swagger for auctions and allowed tokens (e2644452)
*  mass cancel endpoint for secondary market (afeddc93)
*  nonce for auction transactions (b64104f7)
*  remove web3 connection from mass sales (13d4193c)
*  mass auction sale (f907542f)
*  mass fixprice sale (b5614ca7)
*  collections filter (3676e26e)
*  add allowed tokens id (66389261)
*  better admin collections responses (a9a940c0)
*  api for collection list (181f11aa)
*  api for create and remove collections in admin (2181a28f)
*  collection ids from database for escrow (0997d31b)
*  import collections from unique network (bc3810bc)
*  user authorization by signature (eca18442)
*  add administration entity and migration configuration (fab413c7)
* **settings:**
  *  Added market type and administrators for settings (1b5fdb1a)
  *  Updated settings and added allowed tokens. (8ac3af6a)
* **admin:**
  *  Added into settings market type and main sale seed (62de8c99)
  *  Added settings, documented swagger endpoints (a5382fc5)

##### Bug Fixes

*  Fixed offer_status (ab93541b)
*  Fixed sorting by filter; (770090f2)
*  Fixed filter by search (e90956b9)
*  Fixed bug with search by tokenId (cbe2dfbc)
*  Remove old (a1ec7f83)
*  refactor code (51b9916f)
*  Updated package-lock.json (76e465e7)
*  Removed old @unique-nft (40d76db6)
*  Updated SearchIndex (baf0b8a3)
*  Change name (5984393f)
*  Added SearchIndext to migrations (0783520e)
*  Removed migration by SearchIndex (15970f36)
*  Updated library (753513dd)
*  max value for mass sale prices (693900e9)
*  If schema is null (a5a3d59f)
*  Search Index (f32d0443)
*  Fixed properrty for escrow (b53a9ed7)
*  add helmet (cf6b00db)
*  cors added signature (b6969b49)
*  cors added Authorization in header (ef970462)
*  cors settings (4bb3db50)
*  cors settings (3d9139c8)
*  migration collections (017784d9)
*  migration collection (ff574653)
*  cors security (64ad0a97)
*  settings collectionIds not updates on enable/disable (37090c9c)
*  serve static root (faa625d5)
* **settings:**  admin list change format string to array (f7e3e778)
* **admin:**  Updated controllers in admin endpoints. fix(docs): Added short documentation for swagger in admin endpoints. (a5a81f24)

##### Other Changes

*  upd version (f8f161e7)
*  update message for addTokens endpoint (96a22e46)
*  fix mass sale endpoints 500 error (f73e614e)
*  impor links (369b728f)
*  Added admin list to global config (4fcfc652)

##### Refactors

*  Added offer filter (39777977)
*  Changed method find by offers (c566bd79)

