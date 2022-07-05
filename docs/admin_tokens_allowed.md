## Adding tokens to allowed

You can specify which tokens you want to place on the marketplace of selected collection.

First, indicate the collection number! Next, specify which tokens that will participate on the marketplace.

Example: `8,9,1000` - owners of these tokens will be able to put them up for sale or auction.

You can also set the tokens to the advanced option:

- `1-100` - will set from 1 to 100 tokens
- `3,5,7-12,27-42` - in this option the following tokens will be set: 3 and 5, from 7 to 12 and from 27 to 42

**NOTE:** Please note that you can specify tokens separated by commas and, in the case of setting several, through dashes without spaces and other characters.

**NOTE:** All tokens can be added to allowed if you specify an empty string for tokens in the body of the request
