export const tree: Record<string, any> = {
  'bookmarks': {
    '_type': 'application/vnd.oada.bookmarks.1+json',
    '_rev': 0,
    'lab-results': {
      '_type': 'application/vnd.oada.trellisfw.1+json',
      '_rev': 0,
      '*': {
        '_type': 'application/vnd.oada.trellisfw.1+json',
        '_rev': 0,
        'event-date-index': {
          '*': {
            '_type': 'application/vnd.oada.trellisfw.1+json',
            '_rev': 0,
            'md5-index': {
              '*': {
                '_type': 'application/vnd.oada.trellisfw.1+json',
                '_rev': 0,
              },
            },
          },
        },
      },
    },
  },
};

export default tree;