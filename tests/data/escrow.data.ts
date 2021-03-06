export const ConstDataPlayload = {
  traits: [3, 17],
  ipfsJson: '{"ipfs":"QmS8YXgfGKgTUnjAPtEf3uf5k4YrFLP2uDcYuNyGLnEiNb","type":"image"}',
  gender: 0,
};

export const TraitsSchema = {
  nested: {
    onChainMetaData: {
      nested: {
        NFTMeta: {
          fields: {
            ipfsJson: {
              id: 1,
              rule: 'required',
              type: 'string',
            },
            gender: {
              id: 2,
              rule: 'required',
              type: 'Gender',
            },
            traits: {
              id: 3,
              rule: 'repeated',
              type: 'PunkTrait',
            },
          },
        },
        Gender: {
          options: {
            Female: '{"en": "Female"}',
            Male: '{"en": "Male"}',
          },
          values: {
            Female: 1,
            Male: 0,
          },
        },
        PunkTrait: {
          options: {
            BLACK_LIPSTICK: '{"en": "Black Lipstick"}',
            RED_LIPSTICK: '{"en": "Red Lipstick"}',
            SMILE: '{"en": "Smile"}',
            TEETH_SMILE: '{"en": "Teeth Smile"}',
            PURPLE_LIPSTICK: '{"en": "Purple Lipstick"}',
            NOSE_RING: '{"en": "Nose Ring"}',
            ASIAN_EYES: '{"en": "Asian Eyes"}',
            SUNGLASSES: '{"en": "Sunglasses"}',
            RED_GLASSES: '{"en": "Red Glasses"}',
            ROUND_EYES: '{"en": "Round Eyes"}',
            LEFT_EARRING: '{"en": "Left Earring"}',
            RIGHT_EARRING: '{"en": "Right Earring"}',
            TWO_EARRINGS: '{"en": "Two Earrings"}',
            BROWN_BEARD: '{"en": "Brown Beard"}',
            MUSTACHE_BEARD: '{"en": "Mustache Beard"}',
            MUSTACHE: '{"en": "Mustache"}',
            REGULAR_BEARD: '{"en": "Regular Beard"}',
            UP_HAIR: '{"en": "Up Hair"}',
            DOWN_HAIR: '{"en": "Down Hair"}',
            MAHAWK: '{"en": "Mahawk"}',
            RED_MAHAWK: '{"en": "Red Mahawk"}',
            ORANGE_HAIR: '{"en": "Orange Hair"}',
            BUBBLE_HAIR: '{"en": "Bubble Hair"}',
            EMO_HAIR: '{"en": "Emo Hair"}',
            THIN_HAIR: '{"en": "Thin Hair"}',
            BALD: '{"en": "Bald"}',
            BLONDE_HAIR: '{"en": "Blonde Hair"}',
            CARET_HAIR: '{"en": "Caret Hair"}',
            PONY_TAILS: '{"en": "Pony Tails"}',
            CIGAR: '{"en": "Cigar"}',
            PIPE: '{"en": "Pipe"}',
          },
          values: {
            BLACK_LIPSTICK: 0,
            RED_LIPSTICK: 1,
            SMILE: 2,
            TEETH_SMILE: 3,
            PURPLE_LIPSTICK: 4,
            NOSE_RING: 5,
            ASIAN_EYES: 6,
            SUNGLASSES: 7,
            RED_GLASSES: 8,
            ROUND_EYES: 9,
            LEFT_EARRING: 10,
            RIGHT_EARRING: 11,
            TWO_EARRINGS: 12,
            BROWN_BEARD: 13,
            MUSTACHE_BEARD: 14,
            MUSTACHE: 15,
            REGULAR_BEARD: 16,
            UP_HAIR: 17,
            DOWN_HAIR: 18,
            MAHAWK: 19,
            RED_MAHAWK: 20,
            ORANGE_HAIR: 21,
            BUBBLE_HAIR: 22,
            EMO_HAIR: 23,
            THIN_HAIR: 24,
            BALD: 25,
            BLONDE_HAIR: 26,
            CARET_HAIR: 27,
            PONY_TAILS: 28,
            CIGAR: 29,
            PIPE: 30,
          },
        },
      },
    },
  },
};
