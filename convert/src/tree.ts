// re-used for each type of lab result below
const eventDateIndex = {
  '_type': 'application/vnd.modus.lab-results.index.1+json',
  '_rev': 0,
  'event-date-index': {
    '*': {
      '_type': 'application/vnd.modus.lab-results.index.1+json',
      '_rev': 0,
      'md5-index': {
        '*': {
          '_type': 'application/vnd.modus.slim.v1.0+json',
          '_rev': 0,
        },
      },
    },
  },
};

export const tree: Record<string, any> = {
  'bookmarks': {
    '_type': 'application/vnd.oada.bookmarks.1+json',
    '_rev': 0,
    'lab-results': {
      '_type': 'application/vnd.trellis.lab-results.1+json',
      '_rev': 0,
      'soil':         eventDateIndex,
      'plant-tissue': eventDateIndex,
      'nematode':     eventDateIndex,
      'water':        eventDateIndex,
      'residue':      eventDateIndex,
    },
  },
};

export default tree;