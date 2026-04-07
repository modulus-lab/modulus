import { v4 as uuidv4 } from 'uuid';

export interface Storage {
  createCollection: (name: string) => void;
  insert: (collection: string, document: any) => string;
  findByUniqueKey: (collection: string, type: string, value: string) => any[];
  findLatest: (collection: string) => any | null;
  updateById: (collection: string, id: string, updater: (doc: any) => any) => any | null;
}

interface Document {
  id: string;
  createdAt: string;
  [key: string]: any;
}

type Collection = Map<string, Document>;
type Collections = Map<string, Collection>;

const createDocument = (document: any): Document => ({
  ...document,
  id: uuidv4(),
  createdAt: new Date().toISOString(),
});

const hasUniqueKeyMatch = (document: Document, type: string, value: string): boolean =>
  document.uniqueKeys?.[type] === value;

const sortByCreatedAt = (a: Document, b: Document): number =>
  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

export const createInMemoryStorage = (): Storage => {
  const collections: Collections = new Map();

  const getOrCreateCollection = (name: string): Collection => {
    if (!collections.has(name)) {
      collections.set(name, new Map());
    }
    return collections.get(name)!;
  };

  const getCollectionValues = (collection: string): Document[] => {
    const coll = collections.get(collection);
    return coll ? Array.from(coll.values()) : [];
  };

  return {
    createCollection: (name: string): void => {
      getOrCreateCollection(name);
    },

    insert: (collection: string, document: any): string => {
      const coll = getOrCreateCollection(collection);
      const doc = createDocument(document);
      coll.set(doc.id, doc);
      return doc.id;
    },

    findByUniqueKey: (collection: string, type: string, value: string): any[] =>
      getCollectionValues(collection).filter(doc => hasUniqueKeyMatch(doc, type, value)),

    findLatest: (collection: string): any | null => {
      const values = getCollectionValues(collection);
      return values.length > 0 ? values.sort(sortByCreatedAt)[0] : null;
    },

    updateById: (collection: string, id: string, updater: (doc: any) => any): any | null => {
      const coll = getOrCreateCollection(collection);
      const existing = coll.get(id);
      if (!existing) return null;
      const updated = {
        ...existing,
        ...updater(existing),
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString()
      };
      coll.set(id, updated);
      return updated;
    },
  };
};

let storageInstance: Storage | null = null;

export const configureStorage = (storage: Storage): void => {
  storageInstance = storage;
};

export const getStorage = (): Storage => {
  if (!storageInstance) {
    throw new Error('Storage not configured. Call configureStorage() before using storage.');
  }
  return storageInstance;
};
