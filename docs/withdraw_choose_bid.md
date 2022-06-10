## Withdraw choose bid

To authorize, you need to pass a header like `address:signature`

Phrase in signature:

- for one auction: `timestamp=???&auctionId=???` which are taken from the query params
- for several auctions: `timestamp=???&auctionId=???&auctionId=???&auctionId=???` which are taken from the query params
