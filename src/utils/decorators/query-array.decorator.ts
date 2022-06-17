export function queryArray(name: string, itemType: string) {
  return {
    name,
    required: false,
    isArray: true,
    schema: {
      items: {
        type: itemType,
        default: '',
      },
      type: 'array',
    },
  };
}
